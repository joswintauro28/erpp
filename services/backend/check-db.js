const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    }
  });
  console.log('USERS:', users);

  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    }
  });
  console.log('ORGANIZATIONS:', orgs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
