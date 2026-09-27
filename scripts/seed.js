require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('Seeding database...');

  if (await prisma.role.findFirst()) {
    console.log('System already seeded. Skipping.');
    return;
  }

  const roles = await Promise.all([
    prisma.role.create({ data: { name: 'System Admin', type: 'SYSTEM_ADMIN', description: 'Full access within an organization' } }),
    prisma.role.create({ data: { name: 'Module Admin', type: 'MODULE_ADMIN', description: 'Can manage specific modules' } }),
    prisma.role.create({ data: { name: 'Viewer', type: 'VIEWER', description: 'Read-only access' } }),
  ]);

  const modules = await Promise.all([
    prisma.module.create({ data: { type: 'GENERAL_SURVEY', name: 'General Surveys', description: 'Standard internal surveys' } }),
    prisma.module.create({ data: { type: 'ANONYMOUS_SURVEY', name: 'Anonymous Surveys', description: 'Anonymous feedback collection' } }),
    prisma.module.create({ data: { type: 'WHISTLEBLOWING', name: 'Whistleblowing', description: 'Confidential whistleblowing reports' } }),
  ]);

  console.log(`Created ${roles.length} roles and ${modules.length} modules.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
