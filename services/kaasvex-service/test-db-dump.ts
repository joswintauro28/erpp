import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          organization: true,
          role: true
        }
      }
    }
  });

  const orgs = await prisma.organization.findMany();
  
  const dump = {
    users,
    orgs
  };

  fs.writeFileSync('db-dump.json', JSON.stringify(dump, null, 2), 'utf8');
  console.log('Dump written to db-dump.json');
}

main().finally(() => prisma.$disconnect());

