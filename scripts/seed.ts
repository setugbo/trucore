import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const existingRoles = await prisma.role.findFirst();
  if (existingRoles) {
    console.log("System already seeded. Skipping.");
    return;
  }

  const roles = await Promise.all([
    prisma.role.create({ data: { name: "Super Admin", type: "SUPER_ADMIN", description: "Full system access" } }),
    prisma.role.create({ data: { name: "Organization Admin", type: "ORG_ADMIN", description: "Full access within org" } }),
    prisma.role.create({ data: { name: "Module Admin", type: "MODULE_ADMIN", description: "Manage specific modules" } }),
    prisma.role.create({ data: { name: "Contributor", type: "CONTRIBUTOR", description: "Create and edit content" } }),
    prisma.role.create({ data: { name: "Viewer", type: "VIEWER", description: "Read-only access" } }),
    prisma.role.create({ data: { name: "Respondent", type: "RESPONDENT", description: "Respond to surveys" } }),
  ]);

  const modules = await Promise.all([
    prisma.module.create({ data: { type: "GENERAL_SURVEY", name: "General Surveys", description: "Standard internal surveys" } }),
    prisma.module.create({ data: { type: "ANONYMOUS_SURVEY", name: "Anonymous Surveys", description: "Anonymous feedback" } }),
    prisma.module.create({ data: { type: "WHISTLEBLOWING", name: "Whistleblowing", description: "Confidential reporting" } }),
  ]);

  for (const role of roles) {
    const canAll = ["SUPER_ADMIN", "ORG_ADMIN", "MODULE_ADMIN"].includes(role.type);
    const canWrite = canAll || role.type === "CONTRIBUTOR";
    const canView = canAll || canWrite || role.type === "VIEWER";

    for (const mod of modules) {
      await prisma.permission.create({
        data: {
          roleId: role.id,
          moduleId: mod.id,
          canView,
          canCreate: canWrite,
          canEdit: canWrite,
          canDelete: canAll,
        },
      });
    }
  }

  console.log(`Created ${roles.length} roles and ${modules.length} modules with permissions.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
