import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

const orgSchema = Joi.object({
  name: Joi.string().min(2).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).required()
});

const brandingSchema = Joi.object({
  primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  accentColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  invoiceFooter: Joi.string().allow('', null).optional(),
  paymentTerms: Joi.string().allow('', null).optional(),
  logoUrl: Joi.string().uri().allow('', null).optional()
});

// GET /api/settings
export const getSettings = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.tenant.id }
    });

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { twoFactorEnabled: true }
    });

    res.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        primaryColor: org.primaryColor,
        accentColor: org.accentColor,
        logoUrl: org.logoUrl,
        invoiceFooter: org.invoiceFooter,
        paymentTerms: org.paymentTerms,
        stripeConnected: org.stripeConnected,
        quickbooksConnected: org.quickbooksConnected,
        slackConnected: org.slackConnected,
        zapierConnected: org.zapierConnected,
        apiKey: org.apiKey
      },
      user: {
        twoFactorEnabled: user?.twoFactorEnabled || false
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error fetching settings' });
  }
};

// PUT /api/settings/organization
export const updateOrganization = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = orgSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, slug } = value;

    // Check slug availability if changed
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    });

    if (existingOrg && existingOrg.id !== req.tenant.id) {
      return res.status(400).json({ error: 'Organization subdomain slug already in use.' });
    }

    const updated = await prisma.organization.update({
      where: { id: req.tenant.id },
      data: { name, slug }
    });

    res.json({
      message: 'Organization settings updated successfully.',
      organization: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug
      }
    });
  } catch (error) {
    console.error('Update organization settings error:', error);
    res.status(500).json({ error: 'Internal server error saving organization settings' });
  }
};

// PUT /api/settings/branding
export const updateBranding = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = brandingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { primaryColor, accentColor, invoiceFooter, paymentTerms, logoUrl } = value;

    const updated = await prisma.organization.update({
      where: { id: req.tenant.id },
      data: {
        primaryColor,
        accentColor,
        invoiceFooter: invoiceFooter || '',
        paymentTerms: paymentTerms || '',
        logoUrl: logoUrl || null
      }
    });

    res.json({
      message: 'Branding and invoice configuration saved successfully.',
      branding: {
        primaryColor: updated.primaryColor,
        accentColor: updated.accentColor,
        invoiceFooter: updated.invoiceFooter,
        paymentTerms: updated.paymentTerms,
        logoUrl: updated.logoUrl
      }
    });
  } catch (error) {
    console.error('Update branding error:', error);
    res.status(500).json({ error: 'Internal server error saving branding configurations' });
  }
};

// POST /api/settings/integrations/:service/toggle
export const toggleIntegration = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { service } = req.params;
    const org = await prisma.organization.findUnique({
      where: { id: req.tenant.id }
    });

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    let updateData = {};
    if (service === 'stripe') {
      updateData = { stripeConnected: !org.stripeConnected };
    } else if (service === 'quickbooks') {
      updateData = { quickbooksConnected: !org.quickbooksConnected };
    } else if (service === 'slack') {
      updateData = { slackConnected: !org.slackConnected };
    } else if (service === 'zapier') {
      updateData = { zapierConnected: !org.zapierConnected };
    } else {
      return res.status(400).json({ error: 'Unsupported integration service' });
    }

    const updated = await prisma.organization.update({
      where: { id: req.tenant.id },
      data: updateData
    });

    res.json({
      message: `${service.toUpperCase()} integration status toggled successfully.`,
      integration: {
        stripeConnected: updated.stripeConnected,
        quickbooksConnected: updated.quickbooksConnected,
        slackConnected: updated.slackConnected,
        zapierConnected: updated.zapierConnected
      }
    });
  } catch (error) {
    console.error('Toggle integration error:', error);
    res.status(500).json({ error: 'Internal server error toggling integration status' });
  }
};

// POST /api/settings/api-key/regenerate
export const regenerateApiKey = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randStr = '';
    for (let i = 0; i < 24; i++) {
      randStr += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const newApiKey = `vk_live_${randStr}`;

    const updated = await prisma.organization.update({
      where: { id: req.tenant.id },
      data: { apiKey: newApiKey }
    });

    res.json({
      message: 'New API Key successfully regenerated.',
      apiKey: updated.apiKey
    });
  } catch (error) {
    console.error('Regenerate API key error:', error);
    res.status(500).json({ error: 'Internal server error regenerating API access tokens' });
  }
};

// GET /api/settings/users
export const getUsers = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { organizationId: req.tenant.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        role: true
      }
    });

    const roles = await prisma.role.findMany({
      where: { organizationId: req.tenant.id },
      select: { id: true, name: true }
    });

    res.json({
      members: memberships.map(m => ({
        id: m.id,
        status: m.status,
        joinedAt: m.joinedAt,
        user: m.user,
        role: {
          id: m.role.id,
          name: m.role.name
        }
      })),
      roles
    });
  } catch (error) {
    console.error('Get setting users error:', error);
    res.status(500).json({ error: 'Internal server error fetching team members' });
  }
};

// PUT /api/settings/users/:membershipId
export const updateUserRole = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { membershipId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ error: 'Role identifier is required' });
    }

    // Verify role belongs to organization
    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId: req.tenant.id }
    });

    if (!role) {
      return res.status(400).json({ error: 'Invalid role selection' });
    }

    // Update membership role
    const updated = await prisma.organizationMember.update({
      where: { id: membershipId, organizationId: req.tenant.id },
      data: { roleId },
      include: { role: true }
    });

    res.json({
      message: 'User role updated successfully.',
      member: {
        id: updated.id,
        role: {
          id: updated.role.id,
          name: updated.role.name
        }
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error updating member role' });
  }
};

// DELETE /api/settings/users/:membershipId
export const deleteUser = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { membershipId } = req.params;

    // Check if membership is the current user themselves
    const membership = await prisma.organizationMember.findUnique({
      where: { id: membershipId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Member not found in workspace' });
    }

    if (membership.userId === req.user?.id) {
      return res.status(400).json({ error: 'Cannot remove yourself from the organization workspace.' });
    }

    // Delete membership
    await prisma.organizationMember.delete({
      where: { id: membershipId, organizationId: req.tenant.id }
    });

    res.json({
      message: 'Member removed from organization successfully.'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error removing member' });
  }
};

// POST /api/settings/security/change-password
export const changePassword = async (req: MultiTenantRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user?.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User identity profile not found' });
    }

    // Validate current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Current password provided is incorrect' });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed }
    });

    res.json({
      message: 'Password successfully updated.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error updating password' });
  }
};

// POST /api/settings/security/2fa
export const toggle2fa = async (req: MultiTenantRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User identity profile not found' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: !user.twoFactorEnabled }
    });

    res.json({
      message: `Two-Factor Authentication (2FA) ${updated.twoFactorEnabled ? 'enabled' : 'disabled'} successfully.`,
      twoFactorEnabled: updated.twoFactorEnabled
    });
  } catch (error) {
    console.error('Toggle 2FA error:', error);
    res.status(500).json({ error: 'Internal server error toggling two-factor authentication state' });
  }
};
