import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    console.log(`Email: ${user.email}`);
    console.log(`  Hash:   ${user.password}`);
    console.log(`  Length: ${user.password.length}`);
  }
}

main().finally(() => prisma.$disconnect());
