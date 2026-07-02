import { Response, NextFunction } from 'express';
import { MultiTenantRequest } from './tenant.middleware';
import { PrismaClient } from '@prisma/client';
import { 
  addSecurityLog, 
  securityTelemetry, 
  createAuditLog,
  ensureSecurityConfig 
} from '../services/security.service';

const prisma = new PrismaClient();

// In-memory store for rate limiting: IP -> timestamp array
const requestTracker = new Map<string, number[]>();

/**
 * Web Application Firewall (WAF) Middleware
 * Scans SQL injection and XSS patterns in request payload
 */
export const wafGuard = async (req: MultiTenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant?.id || (req.headers['x-tenant-id'] as string);
    
    let wafEnabled = true;

    // Check custom settings if organization context exists
    if (tenantId) {
      const config = await ensureSecurityConfig(tenantId);
      wafEnabled = config.wafEnabled;
    }

    if (!wafEnabled) {
      return next();
    }

    // Exploit patterns
    const sqliPattern = /(UNION\s+SELECT|SELECT\s+.*\s+FROM|'OR\s+'\d+'\s*=\s*'\d+|"\s*OR\s*"\d+"\s*=\s*"\d+)/i;
    const xssPattern = /(<script.*?>|javascript:|onload\s*=|onerror\s*=|<iframe.*?>)/i;

    // Build values string from payload to check
    const bodyStr = JSON.stringify(req.body || {});
    const queryStr = JSON.stringify(req.query || {});
    const urlStr = req.url || '';

    const contentToCheck = `${bodyStr} ${queryStr} ${urlStr}`;

    const hasSql = sqliPattern.test(contentToCheck);
    const hasXss = xssPattern.test(contentToCheck);

    if (hasSql || hasXss) {
      const attackType = hasSql ? 'SQL Injection' : 'Cross-Site Scripting (XSS)';
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      
      securityTelemetry.wafBlockedCount++;
      addSecurityLog(`[WAF Block] BLOCKED ${attackType} vector from IP ${ip}. Request URL: ${req.method} ${req.url}`);

      if (tenantId) {
        await createAuditLog({
          organizationId: tenantId,
          userId: req.user?.id,
          action: 'BLOCKED_ATTACK',
          resource: `WAF Filter Intercept: ${attackType}`,
          ipAddress: ip,
          userAgent: req.headers['user-agent'],
          payload: { url: req.url, method: req.method }
        });
      }

      res.status(403).json({ error: `WAF Intercept: Request blocked due to potential ${attackType} attack.` });
      return;
    }

    next();
  } catch (error) {
    console.error('WAF middleware error:', error);
    next(); // Fail-open in production, or restrict. Here we pass to keep app running
  }
};

/**
 * Sliding Window Rate Limiting Middleware
 * Throttles requests based on RPM parameter in database per tenant/IP
 */
export const rateLimiterGuard = async (req: MultiTenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant?.id || (req.headers['x-tenant-id'] as string);
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    
    let rpmLimit = 120; // default cap

    if (tenantId) {
      const config = await ensureSecurityConfig(tenantId);
      rpmLimit = config.rateLimitRpm;
    }

    const now = Date.now();
    const windowStart = now - 60 * 1000; // 1 minute window

    // Retrieve previous request timestamps for this client IP
    let timestamps = requestTracker.get(ip) || [];
    
    // Filter timestamps keeping only those within the active 60s window
    timestamps = timestamps.filter(ts => ts > windowStart);
    
    if (timestamps.length >= rpmLimit) {
      securityTelemetry.rateLimitThrottledCount++;
      addSecurityLog(`[Rate Limiter] Throttled IP ${ip}. Requests in 60s: ${timestamps.length} (Limit: ${rpmLimit}).`);
      
      res.status(429).json({ error: 'Too many requests. Rate limit threshold exceeded. Wait 60 seconds.' });
      return;
    }

    // Log this request timestamp
    timestamps.push(now);
    requestTracker.set(ip, timestamps);

    next();
  } catch (error) {
    console.error('Rate limiting middleware error:', error);
    next();
  }
};
