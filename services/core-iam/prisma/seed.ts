import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSION_CODES = [
  'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
  'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete',
  'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.delete',
  'products.view', 'products.create', 'products.edit', 'products.delete',
  'stock.view', 'stock.manage', 'stock.adjust',
  'payments.view', 'payments.create', 'payments.edit', 'payments.delete',
  'expenses.view', 'expenses.create', 'expenses.edit',
  'reports.view',
  'settings.manage',
  'users.manage',
  'suppliers.view', 'suppliers.create', 'suppliers.manage',
  'accounting.view', 'accounting.create', 'accounting.edit', 'accounting.delete',
  'workflow.manage',
  'audit_logs.view',
];

const SYSTEM_ROLES = {
  'Organization Owner': PERMISSION_CODES,
  'Accountant': [
    'clients.view', 'clients.create', 'clients.edit',
    'invoices.view', 'invoices.create', 'invoices.edit',
    'payments.view', 'payments.create',
    'reports.view',
    'accounting.view', 'accounting.create',
  ],
  'Sales Executive': [
    'clients.view', 'clients.create', 'clients.edit',
    'quotations.view', 'quotations.create', 'quotations.edit',
    'invoices.view',
    'products.view',
  ],
  'Inventory Manager': [
    'products.view', 'products.create', 'products.edit',
    'stock.view', 'stock.manage', 'stock.adjust',
    'suppliers.view', 'suppliers.create', 'suppliers.manage',
  ],
  'Auditor': [
    'reports.view',
    'audit_logs.view',
    'invoices.view',
    'payments.view',
  ],
  'Employee': [
    'clients.view',
    'invoices.view',
    'products.view',
    'stock.view',
    'reports.view',
  ],
};

async function main() {
  console.log('Start seeding core-iam database...');

  // 1. Seed Permissions
  console.log('Seeding permissions...');
  const permissionMap = new Map<string, number>();
  for (const code of PERMISSION_CODES) {
    const perm = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code,
        module: code.split('.')[0],
      },
    });
    permissionMap.set(code, perm.id);
  }

  // 2. Seed Roles and RolePermissions
  console.log('Seeding roles and mapping permissions...');
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

    // Map permissions
    for (const code of permissions) {
      const permId = permissionMap.get(code);
      if (permId) {
        // Find or create role-permission link
        const existingRp = await prisma.rolePermission.findFirst({
          where: {
            roleId: role.id,
            permissionId: permId,
          },
        });
        if (!existingRp) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permId,
            },
          });
        }
      }
    }
  }

  // 3. Seed Users
  console.log('Seeding users...');
  const usersData = [
    { email: 'admin@datavex.com', pw: 'Admin@123!', name: 'Alex Chen', role: 'Organization Owner' },
    { email: 'sales@datavex.com', pw: 'Sales@123!', name: 'Maya Patel', role: 'Sales Executive' },
    { email: 'accounts@datavex.com', pw: 'Acc@123!', name: 'Jordan Kim', role: 'Accountant' },
    { email: 'inventory@datavex.com', pw: 'Inv@123!', name: 'Sam Rivera', role: 'Inventory Manager' },
    { email: 'auditor@datavex.com', pw: 'Aud@123!', name: 'Priya Sharma', role: 'Auditor' },
    { email: 'admin@example.com', pw: 'password123', name: 'System Admin', role: 'Organization Owner' },
  ];

  const dbUsers = [];
  const salt = await bcrypt.genSalt(10);

  for (const u of usersData) {
    const passwordHash = await bcrypt.hash(u.pw, salt);
    const dbUser = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
      },
      create: {
        email: u.email,
        passwordHash,
        fullName: u.name,
        isActive: true,
      },
    });
    dbUsers.push({ user: dbUser, roleName: u.role });
  }

  // 4. Create Organization (shared for Datavex users, or admin specific)
  console.log('Seeding organization and assignments...');
  const mainAdmin = dbUsers.find(du => du.user.email === 'admin@datavex.com')?.user;
  
  if (mainAdmin) {
    const org = await prisma.organization.create({
      data: {
        name: 'DATAVEX Industries',
        ownerId: mainAdmin.id,
      },
    });

    // Link users to organization and roles
    for (const du of dbUsers) {
      const roleId = roleMap.get(du.roleName);
      
      const existingMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: org.id,
          userId: du.user.id,
        },
      });

      if (!existingMember) {
        await prisma.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: du.user.id,
            roleId: roleId || null,
            status: 'active',
          },
        });
      }
    }
  }

  // 5. Seed Settings - ONLY FOR ADMINS (Alex Chen and System Admin)
  console.log('Seeding settings for administrators...');
  const admins = dbUsers.filter(du => du.roleName === 'Organization Owner');

  for (const ad of admins) {
    const userId = ad.user.id;
    const email = ad.user.email;

    // Company Settings
    await prisma.companySetting.upsert({
      where: { ownerId: userId },
      update: {},
      create: {
        ownerId: userId,
        companyName: email === 'admin@datavex.com' ? 'DATAVEX Industries Pvt. Ltd.' : "Admin's Company",
        email: email,
        phone: '+91-80-4567-8900',
        address: '42, Industrial Layout, Whitefield, Bangalore — 560066',
        state: 'Karnataka',
        gstNumber: '29AABCD1234E1Z5',
        website: email === 'admin@datavex.com' ? 'https://datavex.com' : 'https://example.com',
        industry: 'Industrial Automation & Electronics',
      },
    });

    // Branding Settings
    await prisma.brandingSetting.upsert({
      where: { ownerId: userId },
      update: {},
      create: {
        ownerId: userId,
        logoUrl: '/brand/logo.svg',
        primaryColor: '#96282E',
        accentColor: '#CBA052',
        invoiceFooter: 'Thank you for your business! Payment due within 15 days.',
        paymentTerms: 'Net 15 — 2% discount if paid within 7 days',
      },
    });

    // Notification Settings
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

    // Workflow Settings
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

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
