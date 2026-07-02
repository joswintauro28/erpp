import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MultiTenantRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  tenant?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

/**
 * Global Multi-Tenant & RBAC Context Scoper Middleware
 * Unpacks JWT from Authorization header, resolves organization membership,
 * and sets user and tenant bounds for downstream services.
 */
export const authenticateTenant = async (
  req: MultiTenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid or expired signature' });
    }

    // 1. Resolve user profile
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found in workspace' });
    }

    req.user = user;

    // 2. Resolve requested organization context from headers
    const tenantIdHeader = req.headers['x-tenant-id'] as string;

    // If the endpoint does not require an active tenant scope, pass directly
    if (!tenantIdHeader) {
      return next();
    }

    // Validate tenant ID formatting (prevent simple injection strings)
    const idRegex = /^[a-z0-9-]+$/i; // Scoped for CUIDs or standard slugs/UUIDs
    if (!idRegex.test(tenantIdHeader)) {
      return res.status(400).json({ error: 'Invalid tenant identifier structure' });
    }

    // 3. Query the user's membership and roles inside this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: tenantIdHeader,
          userId: user.id
        }
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!membership || membership.status !== 'JOINED') {
      return res.status(403).json({ error: 'Forbidden: You do not belong to this organization workspace' });
    }

    // 4. Extract standard permission strings
    const permissions = membership.role.permissions.map(rp => rp.permission.code);

    req.tenant = {
      id: tenantIdHeader,
      role: membership.role.name,
      permissions
    };

    next();
  } catch (error) {
    console.error('Tenant Middleware Authentication Failure:', error);
    return res.status(401).json({ error: 'Session authentication failed' });
  }
};

/**
 * RBAC Helper Guard
 * Returns a middleware to verify the user possesses explicit functional scope claims
 */
export const requirePermission = (permissionCode: string) => {
  return (req: MultiTenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active tenant scope context is required for this action' });
    }

    const hasScope = req.tenant.permissions.includes(permissionCode);
    if (!hasScope) {
      return res.status(403).json({ error: `Forbidden: Missing required action scope: ${permissionCode}` });
    }

    next();
  };
};
