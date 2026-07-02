import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from './utils/jwt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password', 12);

  // 1. Create permissions
  const CORE_PERMISSIONS = [
    { code: 'invoices:create', description: 'Create new invoices', module: 'BILLING' },
    { code: 'invoices:read', description: 'Read invoices information', module: 'BILLING' },
    { code: 'invoices:manage', description: 'Edit or cancel invoices', module: 'BILLING' },
    { code: 'ledger:read', description: 'Read General Ledger entries', module: 'ACCOUNTING' },
    { code: 'ledger:write', description: 'Add journal transactions to Ledger', module: 'ACCOUNTING' },
    { code: 'reports:read', description: 'Read Financial P&L and Balance Sheet reports', module: 'ACCOUNTING' },
    { code: 'members:invite', description: 'Invite new organization members', module: 'CRM' }
  ];

  const permissions = [];
  for (const perm of CORE_PERMISSIONS) {
    const dbPerm = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm
    });
    permissions.push(dbPerm);
  }

  // 2. Find or Create User
  let user = await prisma.user.findUnique({
    where: { email: 'nikhil@kaasvex.com' }
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Nikhil',
        email: 'nikhil@kaasvex.com',
        password: hashedPassword
      }
    });
  }

  // 3. Find or Create Org
  let org = await prisma.organization.findUnique({
    where: { slug: 'acme' }
  });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Acme Corp',
        slug: 'acme'
      }
    });
  }

  // 4. Find or Create Role
  let ownerRole = await prisma.role.findFirst({
    where: { organizationId: org.id, name: 'Organization Owner' }
  });
  if (!ownerRole) {
    ownerRole = await prisma.role.create({
      data: {
        organizationId: org.id,
        name: 'Organization Owner',
        description: 'Full account administrative access',
        isSystemRole: true
      }
    });

    await prisma.rolePermission.createMany({
      data: permissions.map(p => ({ roleId: ownerRole!.id, permissionId: p.id }))
    });
  }

  // 5. Find or Create Membership
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id
      }
    }
  });
  if (!membership) {
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        roleId: ownerRole.id,
        status: 'JOINED'
      }
    });
  }

  // 6. Find or Create Client
  let client = await prisma.client.findFirst({
    where: { organizationId: org.id, name: 'Tech Solutions' }
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: 'Tech Solutions',
        email: 'tech@solutions.com',
        organizationId: org.id,
        status: 'Active'
      }
    });
  }

  // 7. Recreate clean invoice (delete old if exists)
  const oldInvoice = await prisma.invoice.findFirst({
    where: { organizationId: org.id, invoiceNumber: 'INV-1001' }
  });
  if (oldInvoice) {
    await prisma.invoice.delete({
      where: { id: oldInvoice.id }
    });
  }

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-1001',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      subtotal: 1000,
      taxAmount: 180,
      total: 1180,
      invoiceType: 'GST',
      currency: 'USD',
      discountAmount: 0,
      organizationId: org.id,
      clientId: client.id,
      status: 'SENT',
      items: {
        create: [
          { description: 'Enterprise Software License', quantity: 1, rate: 1000, amount: 1000 }
        ]
      },
      taxes: {
        create: [
          { name: 'CGST', rate: 9, amount: 90 },
          { name: 'SGST', rate: 9, amount: 90 }
        ]
      }
    }
  });

  const token = generateToken({ userId: user.id });

  console.log('--- SEED COMPLETE ---');
  console.log('Token:', token);
  console.log('TenantID (Org ID):', org.id);
  console.log('InvoiceID:', invoice.id);
  console.log('InvoiceNumber:', invoice.invoiceNumber);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
