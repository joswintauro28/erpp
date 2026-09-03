import { PrismaClient } from '@prisma/client-iam';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSION_CODES = [
  'clients.view',
  'clients.create',
  'clients.edit',
  'clients.delete',
  'invoices.view',
  'invoices.create',
  'invoices.edit',
  'invoices.delete',
  'quotations.view',
  'quotations.create',
  'quotations.edit',
  'quotations.delete',
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  'stock.view',
  'stock.manage',
  'stock.adjust',
  'payments.view',
  'payments.create',
  'payments.edit',
  'payments.delete',
  'expenses.view',
  'expenses.create',
  'expenses.edit',
  'reports.view',
  'reports.export',
  'settings.manage',
  'users.manage',
  'suppliers.view',
  'suppliers.create',
  'suppliers.manage',
  'accounting.view',
  'accounting.create',
  'accounting.edit',
  'accounting.delete',
  'workflow.manage',
  'audit_logs.view',
  'crm.view',
  'crm.edit',
  'dashboard.view',
  'warehouses.view',
  'warehouses.manage',
];

const SYSTEM_ROLES: Record<string, string[]> = {
  'Organization Owner': PERMISSION_CODES,
  Accountant: [
    'invoices.view',
    'invoices.create',
    'invoices.edit',
    'invoices.delete',
    'quotations.view',
    'quotations.create',
    'quotations.edit',
    'quotations.delete',
    'payments.view',
    'payments.create',
    'payments.edit',
    'payments.delete',
    'expenses.view',
    'expenses.create',
    'expenses.edit',
    'accounting.view',
    'accounting.create',
    'accounting.edit',
    'accounting.delete',
    'reports.view',
    'reports.export',
    'dashboard.view',
    'workflow.manage',
  ],
  'Sales Executive': [
    'clients.view',
    'clients.create',
    'clients.edit',
    'quotations.view',
    'quotations.create',
    'quotations.edit',
    'quotations.delete',
    'crm.view',
    'crm.edit',
    'dashboard.view',
  ],
  'Inventory Manager': [
    'products.view',
    'products.create',
    'products.edit',
    'products.delete',
    'stock.view',
    'stock.manage',
    'stock.adjust',
    'suppliers.view',
    'suppliers.create',
    'suppliers.manage',
    'warehouses.view',
    'warehouses.manage',
    'dashboard.view',
  ],
  Auditor: [
    'reports.view',
    'reports.export',
    'audit_logs.view',
    'invoices.view',
    'quotations.view',
    'payments.view',
    'accounting.view',
    'dashboard.view',
  ],
  Employee: [
    'clients.view',
    'invoices.view',
    'products.view',
    'stock.view',
    'reports.view',
    'dashboard.view',
  ],
};

async function main() {
  console.log('Seeding core-iam database...');

  const permissionMap = new Map<string, number>();
  for (const code of PERMISSION_CODES) {
    const perm = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, name: code, module: code.split('.')[0] },
    });
    permissionMap.set(code, perm.id);
  }
  console.log(`  Created ${PERMISSION_CODES.length} permissions`);

  console.log('  Cleaning existing role permission mappings...');
  await prisma.rolePermission.deleteMany({});

  const roleMap = new Map<string, number>();
  for (const [roleName, permissions] of Object.entries(SYSTEM_ROLES)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `${roleName} system role`,
        isSystemRole: true,
      },
    });
    roleMap.set(roleName, role.id);
    for (const code of permissions) {
      const permId = permissionMap.get(code);
      if (permId) {
        const existing = await prisma.rolePermission.findFirst({
          where: { roleId: role.id, permissionId: permId },
        });
        if (!existing) {
          await prisma.rolePermission.create({
            data: { roleId: role.id, permissionId: permId },
          });
        }
      }
    }
  }
  console.log(
    `  Created ${Object.keys(SYSTEM_ROLES).length} roles with permission mappings`,
  );

  const usersData = [
    {
      email: 'admin@datavex.com',
      pw: 'Admin@123!',
      name: 'Alex Chen',
      role: 'Organization Owner',
    },
    {
      email: 'sales@datavex.com',
      pw: 'Sales@123!',
      name: 'Maya Patel',
      role: 'Sales Executive',
    },
    {
      email: 'accounts@datavex.com',
      pw: 'Acc@123!',
      name: 'Jordan Kim',
      role: 'Accountant',
    },
    {
      email: 'inventory@datavex.com',
      pw: 'Inv@123!',
      name: 'Sam Rivera',
      role: 'Inventory Manager',
    },
    {
      email: 'auditor@datavex.com',
      pw: 'Aud@123!',
      name: 'Priya Sharma',
      role: 'Auditor',
    },
  ];

  const salt = await bcrypt.genSalt(10);
  const dbUsers: { user: { id: number; email: string }; roleName: string }[] =
    [];

  for (const u of usersData) {
    const passwordHash = await bcrypt.hash(u.pw, salt);
    const dbUser = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: {
        email: u.email,
        passwordHash,
        fullName: u.name,
        isActive: true,
      },
    });
    dbUsers.push({ user: dbUser, roleName: u.role });
  }
  console.log(`  Created ${usersData.length} users`);

  const mainAdmin = dbUsers.find(
    (du) => du.user.email === 'admin@datavex.com',
  )?.user!;
  // M4: use upsert to avoid creating duplicate orgs on re-runs
  const org = await prisma.organization.upsert({
    where: { id: 1 },
    update: { name: 'DATAVEX Industries Pvt Ltd' },
    create: { name: 'DATAVEX Industries Pvt Ltd', ownerId: mainAdmin.id },
  });

  for (const du of dbUsers) {
    const roleId = roleMap.get(du.roleName);
    // M4: use upsert to avoid duplicate membership race
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId: du.user.id },
      },
      update: { roleId: roleId ?? null, status: 'active' },
      create: {
        organizationId: org.id,
        userId: du.user.id,
        roleId: roleId ?? null,
        status: 'active',
      },
    });
  }
  console.log('  Upserted 1 organization with members');

  for (const du of dbUsers) {
    const userId = du.user.id;
    const isAdmin = du.roleName === 'Organization Owner';
    await prisma.companySetting.upsert({
      where: { ownerId: userId },
      update: {},
      create: {
        ownerId: userId,
        companyName: isAdmin
          ? 'DATAVEX Industries Pvt Ltd'
          : `${du.user.email.split('@')[0]} Consulting`,
        email: du.user.email,
        phone: '+91-80-4567-8900',
        address: '42, Industrial Layout, Whitefield, Bangalore',
        state: 'Karnataka',
        gstNumber: '29AABCD1234E1Z5',
        website: isAdmin ? 'https://datavex.com' : undefined,
        industry: isAdmin
          ? 'Industrial Automation & Electronics'
          : 'Consulting',
      },
    });
    await prisma.brandingSetting.upsert({
      where: { ownerId: userId },
      update: {},
      create: {
        ownerId: userId,
        logoUrl: '/brand/logo.svg',
        primaryColor: '#96282E',
        accentColor: '#CBA052',
        invoiceFooter:
          'Thank you for your business! Payment due within 15 days.',
        paymentTerms: 'Net 15 — 2% discount if paid within 7 days',
      },
    });
    await prisma.notificationSetting.upsert({
      where: { ownerId: userId },
      update: {},
      create: {
        ownerId: userId,
        invoiceNotifications: true,
        paymentReminders: true,
        lowStockAlerts: true,
        weeklyReports: true,
      },
    });
    await prisma.workflowSetting.upsert({
      where: { ownerId: userId },
      update: {},
      create: {
        ownerId: userId,
        sendUpcomingInvoiceReminders: true,
        sendOverdueReminders: true,
        notifyLowStock: true,
        createdAt: new Date().toISOString(),
      },
    });
  }
  console.log(
    '  Created company/branding/notification/workflow settings for all users',
  );

  const userList = dbUsers.map((u) => ({
    id: u.user.id,
    email: u.user.email,
    name: u.user.email.split('@')[0].split('.')[0],
    role: u.roleName,
  }));
  console.log('\nSeed completed. User mapping:');
  userList.forEach((u) => console.log(`  ID ${u.id}: ${u.email} (${u.role})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
