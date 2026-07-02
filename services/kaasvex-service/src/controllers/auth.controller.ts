import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/jwt';
import Joi from 'joi';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

// Standard permissions definitions
const CORE_PERMISSIONS = [
  { code: 'invoices:create', description: 'Create new invoices', module: 'BILLING' },
  { code: 'invoices:read', description: 'Read invoices information', module: 'BILLING' },
  { code: 'invoices:manage', description: 'Edit or cancel invoices', module: 'BILLING' },
  { code: 'ledger:read', description: 'Read General Ledger entries', module: 'ACCOUNTING' },
  { code: 'ledger:write', description: 'Add journal transactions to Ledger', module: 'ACCOUNTING' },
  { code: 'reports:read', description: 'Read Financial P&L and Balance Sheet reports', module: 'ACCOUNTING' },
  { code: 'members:invite', description: 'Invite new organization members', module: 'CRM' }
];

// Helper to seed global permissions dynamically if they do not exist
async function ensureCorePermissionsExist() {
  for (const perm of CORE_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm
    });
  }
}

const signupSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  organizationName: Joi.string().min(2).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const inviteSchema = Joi.object({
  email: Joi.string().email().required(),
  roleId: Joi.string().required()
});

export const signup = async (req: Request, res: Response) => {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email, password, organizationName, slug } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User email is already registered.' });
    }

    // Check slug availability
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    });

    if (existingOrg) {
      return res.status(400).json({ error: 'Organization subdomain slug already in use.' });
    }

    // Seed global permissions first
    await ensureCorePermissionsExist();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Scaffolding multi-tenant database records in a Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User Identity
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword
        }
      });

      // 2. Scaffold Organization Partition
      const org = await tx.organization.create({
        data: {
          name: organizationName,
          slug
        }
      });

      // 3. Provision Default Roles for this Tenant
      const ownerRole = await tx.role.create({
        data: { organizationId: org.id, name: 'Organization Owner', description: 'Full account administrative access', isSystemRole: true }
      });
      const accountantRole = await tx.role.create({
        data: { organizationId: org.id, name: 'Accountant', description: 'Accounting and financial statements ledger auditing', isSystemRole: true }
      });
      const employeeRole = await tx.role.create({
        data: { organizationId: org.id, name: 'Employee', description: 'Standard billing invoice workflows', isSystemRole: true }
      });
      const auditorRole = await tx.role.create({
        data: { organizationId: org.id, name: 'Auditor', description: 'Read-only access to statements and ledgers', isSystemRole: true }
      });

      // 4. Map Role Permissions mapping codes
      const dbPerms = await tx.permission.findMany();
      
      // Owner Role: Mapped to ALL permissions
      await tx.rolePermission.createMany({
        data: dbPerms.map(p => ({ roleId: ownerRole.id, permissionId: p.id }))
      });

      // Accountant Role: Mapped to financial ledger read/write, reports, invoices
      const financePermCodes = ['invoices:read', 'invoices:manage', 'ledger:read', 'ledger:write', 'reports:read'];
      const financePerms = dbPerms.filter(p => financePermCodes.includes(p.code));
      await tx.rolePermission.createMany({
        data: financePerms.map(p => ({ roleId: accountantRole.id, permissionId: p.id }))
      });

      // Employee Role: Mapped to creating and reading invoices
      const employeePermCodes = ['invoices:read', 'invoices:create'];
      const employeePerms = dbPerms.filter(p => employeePermCodes.includes(p.code));
      await tx.rolePermission.createMany({
        data: employeePerms.map(p => ({ roleId: employeeRole.id, permissionId: p.id }))
      });

      // Auditor Role: Mapped to read-only ledgers, reports, invoices
      const auditorPermCodes = ['invoices:read', 'ledger:read', 'reports:read'];
      const auditorPerms = dbPerms.filter(p => auditorPermCodes.includes(p.code));
      await tx.rolePermission.createMany({
        data: auditorPerms.map(p => ({ roleId: auditorRole.id, permissionId: p.id }))
      });

      // 5. Establish Owner Membership bind
      const member = await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          roleId: ownerRole.id,
          status: 'JOINED'
        }
      });

      return { user, org, ownerRole };
    });

    // Generate JWT access token
    const token = generateToken({ userId: result.user.id });

    res.status(201).json({
      message: 'Multi-tenant organization created successfully.',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
        role: 'Organization Owner'
      },
      token
    });
  } catch (error) {
    console.error('Multi-tenant Signup Error:', error);
    res.status(500).json({ error: 'Internal server initialization failure' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG LOGIN] Request Body:', JSON.stringify(req.body));
    console.log('[DEBUG LOGIN] Request Headers:', JSON.stringify(req.headers));

    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      console.log('[DEBUG LOGIN] Schema Validation Error:', error.details[0].message);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;
    console.log(`[DEBUG LOGIN] Querying DB for email: "${email}"`);

    // Find User
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`[DEBUG LOGIN] User record not found for email: "${email}"`);
      return res.status(400).json({ error: 'Invalid user credentials.' });
    }

    console.log(`[DEBUG LOGIN] User found. ID: ${user.id}, Stored Hash: "${user.password}"`);

    // Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`[DEBUG LOGIN] Bcrypt compare result: ${isPasswordValid}`);
    if (!isPasswordValid) {
      console.log('[DEBUG LOGIN] Password comparison failed.');
      return res.status(400).json({ error: 'Invalid user credentials.' });
    }

    // Resolve user organization contexts
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id, status: 'JOINED' },
      include: {
        organization: true,
        role: true
      }
    });

    // Select standard active workspace context if memberships exist
    const activeMember = memberships[0];
    const activeOrganization = activeMember ? {
      id: activeMember.organization.id,
      name: activeMember.organization.name,
      slug: activeMember.organization.slug,
      role: activeMember.role.name
    } : null;

    // Generate JWT
    const token = generateToken({ userId: user.id });

    res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      activeOrganization,
      token
    });
  } catch (error) {
    console.error('Multi-tenant Login Error:', error);
    res.status(500).json({ error: 'Internal server authentication failure' });
  }
};

export const getMe = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized profile request context' });
    }

    // Query all workspace profiles the user belongs to
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: req.user.id },
      include: {
        organization: true,
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

    const organizations = memberships.map(m => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      status: m.status,
      role: m.role.name,
      permissions: m.role.permissions.map(p => p.permission.code)
    }));

    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      organizations
    });
  } catch (error) {
    console.error('Get profile hydrations error:', error);
    res.status(500).json({ error: 'Internal server identity failure' });
  }
};

export const inviteMember = async (req: MultiTenantRequest, res: Response) => {
  try {
    const { error, value } = inviteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, roleId } = value;

    if (!req.tenant) {
      return res.status(403).json({ error: 'Active tenant scope context is required to issue invites' });
    }

    // Check if requester possesses invitation capability
    const canInvite = req.tenant.permissions.includes('members:invite') || req.tenant.role === 'Organization Owner';
    if (!canInvite) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to invite members to this workspace' });
    }

    // Confirm that the target role belongs to the active organization
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId: req.tenant.id
      }
    });

    if (!role) {
      return res.status(400).json({ error: 'Invalid workspace role selection' });
    }

    // Resolve or provision the target user identity mapping
    let targetUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!targetUser) {
      // Provision an isolated placeholder profile for workspace onboarding
      const placeholderPassword = await bcrypt.hash('VexInvitePlaceholderPass123!', 12);
      targetUser = await prisma.user.create({
        data: {
          name: email.split('@')[0], // Base initials
          email,
          password: placeholderPassword
        }
      });
    }

    // Check if they are already mapped in the organization
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: req.tenant.id,
          userId: targetUser.id
        }
      }
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'User is already a member or has a pending invite in this organization.' });
    }

    // Create dynamic invitation entry
    const invitation = await prisma.organizationMember.create({
      data: {
        organizationId: req.tenant.id,
        userId: targetUser.id,
        roleId: role.id,
        status: 'INVITED'
      },
      include: {
        organization: true,
        role: true
      }
    });

    res.status(201).json({
      message: 'Workspace invitation successfully scaffolded.',
      data: {
        invitationId: invitation.id,
        recipient: email,
        organization: invitation.organization.name,
        role: invitation.role.name,
        status: invitation.status
      }
    });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Internal server invitation failure' });
  }
};
