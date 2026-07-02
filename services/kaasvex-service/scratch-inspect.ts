import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  });
  console.log('USERS:', JSON.stringify(users, null, 2));

  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log('ORGANIZATIONS:', JSON.stringify(orgs, null, 2));

  const clients = await prisma.client.findMany({
    select: { id: true, name: true, organizationId: true }
  });
  console.log('CLIENTS:', JSON.stringify(clients, null, 2));

  const invoices = await prisma.invoice.findMany({
    include: { ewayBill: true }
  });
  console.log('INVOICES:', JSON.stringify(invoices, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
