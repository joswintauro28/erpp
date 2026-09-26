import { PrismaClient } from '@prisma/client-iam';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSION_CODES = [
  'customers.view',
  'customers.create',
  'customers.edit',
  'customers.delete',
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
  'purchase_orders.view',
  'purchase_orders.create',
  'purchase_orders.manage',
  'purchase_orders.delete',
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
    'customers.view',
    'customers.create',
    'customers.edit',
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
    'purchase_orders.view',
    'purchase_orders.create',
    'purchase_orders.manage',
    'purchase_orders.delete',
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
    'customers.view',
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

  // Demo organization hierarchy: parent "Eternal" with sub-organizations
  const ownerRoleId = roleMap.get('Organization Owner');
  const upsertOrgByName = async (name: string, parentId: number | null) => {
    const existing = await prisma.organization.findFirst({ where: { name } });
    if (existing) {
      return prisma.organization.update({
        where: { id: existing.id },
        data: { parentId },
      });
    }
    return prisma.organization.create({
      data: { name, ownerId: mainAdmin.id, parentId },
    });
  };
  const upsertAdminMembership = async (organizationId: number) => {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId, userId: mainAdmin.id },
      },
      update: { roleId: ownerRoleId ?? null, status: 'active' },
      create: {
        organizationId,
        userId: mainAdmin.id,
        roleId: ownerRoleId ?? null,
        status: 'active',
      },
    });
  };

  const eternal = await upsertOrgByName('Eternal', null);
  await upsertAdminMembership(eternal.id);
  for (const subName of ['Zomato', 'Blinkit', 'District']) {
    const sub = await upsertOrgByName(subName, eternal.id);
    await upsertAdminMembership(sub.id);
  }
  console.log(
    '  Upserted org hierarchy: Eternal > Zomato, Blinkit, District (admin member of all)',
  );

  const profile = process.env.SEED_PROFILE || (process.argv.includes('--testing') || process.argv.includes('--profile=testing') ? 'testing' : 'dev');
  console.log(`Seeding core-iam database [Profile: ${profile}]...`);

  const allOrgs = [org, eternal, ...(await prisma.organization.findMany({ where: { parentId: eternal.id } }))];

  const BRAND_COLORS: Record<string, { primary: string; accent: string }> = {
    "DATAVEX Industries Pvt Ltd": { primary: "#96282E", accent: "#CBA052" },
    "Eternal": { primary: "#0F5132", accent: "#D1E7DD" },
    "Zomato": { primary: "#E23744", accent: "#FFF0F1" },
    "Blinkit": { primary: "#F8CB46", accent: "#FFF9E6" },
    "District": { primary: "#343A40", accent: "#CED4DA" },
  };

  for (const o of allOrgs) {
    const colors = BRAND_COLORS[o.name] || { primary: "#96282E", accent: "#CBA052" };
    await prisma.companySetting.upsert({
      where: { organizationId: o.id },
      update: {},
      create: {
        organizationId: o.id,
        companyName: o.name,
        email: `info@${o.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        phone: '+91-80-4567-8900',
        address: '42, Industrial Layout, Whitefield, Bangalore',
        state: 'Karnataka',
        gstNumber: '29AABCD1234E1Z5',
        website: `https://${o.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        industry: 'Industrial Automation & Electronics',
      },
    });
    await prisma.brandingSetting.upsert({
      where: { organizationId: o.id },
      update: { primaryColor: colors.primary, accentColor: colors.accent },
      create: {
        organizationId: o.id,
        logoUrl: '/brand/logo.svg',
        primaryColor: colors.primary,
        accentColor: colors.accent,
        invoiceFooter:
          'Thank you for your business! Payment due within 15 days.',
        paymentTerms: 'Net 15 — 2% discount if paid within 7 days',
      },
    });
    await prisma.notificationSetting.upsert({
      where: { organizationId: o.id },
      update: {},
      create: {
        organizationId: o.id,
        invoiceNotifications: true,
        paymentReminders: true,
        lowStockAlerts: true,
        weeklyReports: true,
      },
    });
    await prisma.workflowSetting.upsert({
      where: { organizationId: o.id },
      update: {},
      create: {
        organizationId: o.id,
        sendUpcomingInvoiceReminders: true,
        sendOverdueReminders: true,
        notifyLowStock: true,
        createdAt: new Date().toISOString(),
      },
    });
  }
  console.log(
    '  Created company/branding/notification/workflow settings for all organizations',
  );

  if (profile === 'testing') {
    const maya = dbUsers.find((du) => du.user.email === 'sales@datavex.com')?.user!;
    if (maya && eternal) {
      await prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: eternal.id, userId: maya.id } },
        update: { roleId: ownerRoleId ?? null, status: 'active' },
        create: { organizationId: eternal.id, userId: maya.id, roleId: ownerRoleId ?? null, status: 'active' },
      });
    }

    const jordan = dbUsers.find((du) => du.user.email === 'accounts@datavex.com')?.user!;
    const auditorRoleId = roleMap.get('Auditor') ?? null;
    const zomatoOrg = allOrgs.find((o) => o.name === 'Zomato');
    if (jordan && zomatoOrg) {
      await prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: zomatoOrg.id, userId: jordan.id } },
        update: { roleId: auditorRoleId, status: 'active' },
        create: { organizationId: zomatoOrg.id, userId: jordan.id, roleId: auditorRoleId, status: 'active' },
      });
    }

    const testUserPw = await bcrypt.hash('Test@123!', salt);
    const blinkitOrg = allOrgs.find((o) => o.name === 'Blinkit');
    if (blinkitOrg) {
      const singleOrgUser = await prisma.user.upsert({
        where: { email: 'blinkit-lead@datavex.com' },
        update: { passwordHash: testUserPw },
        create: { email: 'blinkit-lead@datavex.com', passwordHash: testUserPw, fullName: 'Blinkit Lead', isActive: true },
      });
      await prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: blinkitOrg.id, userId: singleOrgUser.id } },
        update: { roleId: roleMap.get('Sales Executive') ?? null, status: 'active' },
        create: { organizationId: blinkitOrg.id, userId: singleOrgUser.id, roleId: roleMap.get('Sales Executive') ?? null, status: 'active' },
      });
    }

    const districtOrg = allOrgs.find((o) => o.name === 'District');
    if (districtOrg) {
      const disabledUser = await prisma.user.upsert({
        where: { email: 'inactive@datavex.com' },
        update: { passwordHash: testUserPw, isActive: false },
        create: { email: 'inactive@datavex.com', passwordHash: testUserPw, fullName: 'Inactive User', isActive: false },
      });
      await prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: districtOrg.id, userId: disabledUser.id } },
        update: { roleId: auditorRoleId, status: 'suspended' },
        create: { organizationId: districtOrg.id, userId: disabledUser.id, roleId: auditorRoleId, status: 'suspended' },
      });
    }
    console.log('  Seeded testing profile RBAC matrix (multi-org, single-org, suspended)');
  }

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
