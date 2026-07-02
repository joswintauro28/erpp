import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const candidates = [
  'password',
  'password123',
  'Password123!',
  'Password123',
  '123456',
  '12345678',
  'admin',
  'admin123',
  'anna@email.com',
  'emm@email.com',
  'anna',
  'emm',
  'VexInvitePlaceholderPass123!',
];

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    console.log(`Checking user: ${user.email}`);
    
    // Add user-specific candidates
    const userCandidates = [
      ...candidates,
      user.name,
      user.email,
      user.email.split('@')[0]
    ];
    
    let matched = false;
    for (const c of userCandidates) {
      if (bcrypt.compareSync(c, user.password)) {
        console.log(`  MATCH FOUND: "${c}"`);
        matched = true;
        break;
      }
    }
    if (!matched) {
      console.log(`  No candidate matched.`);
    }
  }
}

main().finally(() => prisma.$disconnect());
