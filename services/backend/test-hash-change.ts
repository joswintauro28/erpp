import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const email = `test-hash-${Date.now()}@example.com`;
const password = 'Password123!';

async function getHash() {
  const user = await prisma.user.findUnique({
    where: { email }
  });
  return user ? user.password : null;
}

async function run() {
  try {
    console.log('1. Signing up user:', email);
    await axios.post('http://localhost:5000/api/auth/signup', {
      name: 'Hash User',
      email,
      password,
      organizationName: 'Hash Org',
      slug: `hash-org-${Date.now()}`
    });

    const hashAfterSignup = await getHash();
    console.log('Hash after signup:', hashAfterSignup);

    console.log('2. Performing first login...');
    const login1 = await axios.post('http://localhost:5000/api/auth/login', {
      email,
      password
    });
    console.log('First login message:', login1.data.message);

    const hashAfterLogin1 = await getHash();
    console.log('Hash after first login:', hashAfterLogin1);

    console.log('Hashes match?', hashAfterSignup === hashAfterLogin1);

    console.log('3. Performing second login...');
    const login2 = await axios.post('http://localhost:5000/api/auth/login', {
      email,
      password
    });
    console.log('Second login message:', login2.data.message);

  } catch (err: any) {
    console.error('Error during test:', err.response?.data || err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
