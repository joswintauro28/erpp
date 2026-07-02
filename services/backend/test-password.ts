import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const isPasswordMatch = await bcrypt.compare('password', user.password);
    console.log(`User: ${user.email}`);
    console.log(`  Hash: ${user.password}`);
    console.log(`  Matches 'password': ${isPasswordMatch}`);
  }
}

main().finally(() => prisma.$disconnect());

