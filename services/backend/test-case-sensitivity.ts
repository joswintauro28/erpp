import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email }
  });
  console.log(`Query for "${email}":`, user ? `Found (ID: ${user.id})` : 'Not Found');
}

async function run() {
  console.log('Testing case sensitivity lookups on email:');
  
  // Test 1: exact lowercase
  await checkUser('persist@test.com');

  // Test 2: mixed case
  await checkUser('Persist@test.com');

  // Test 3: uppercase
  await checkUser('PERSIST@TEST.COM');

  await prisma.$disconnect();
}

run();
