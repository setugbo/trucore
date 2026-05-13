require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  console.log("Seeding TRUCORE with comprehensive demo data...\n");

  let roles = await prisma.role.findMany();
  let modules = await prisma.module.findMany();

  if (roles.length === 0) {
    console.log("Initializing roles and modules...");
    roles = await Promise.all([
      prisma.role.create({ data: { name: "Super Admin", type: "SUPER_ADMIN", description: "Full system access" } }),
      prisma.role.create({ data: { name: "Organization Admin", type: "ORG_ADMIN", description: "Full access within org" } }),
      prisma.role.create({ data: { name: "Module Admin", type: "MODULE_ADMIN", description: "Manage specific modules" } }),
      prisma.role.create({ data: { name: "Contributor", type: "CONTRIBUTOR", description: "Create and edit content" } }),
      prisma.role.create({ data: { name: "Viewer", type: "VIEWER", description: "Read-only access" } }),
      prisma.role.create({ data: { name: "Respondent", type: "RESPONDENT", description: "Respond to surveys" } }),
    ]);
    modules = await Promise.all([
      prisma.module.create({ data: { type: "GENERAL_SURVEY", name: "General Surveys", description: "Standard internal surveys" } }),
      prisma.module.create({ data: { type: "ANONYMOUS_SURVEY", name: "Anonymous Surveys", description: "Anonymous feedback" } }),
      prisma.module.create({ data: { type: "WHISTLEBLOWING", name: "Whistleblowing", description: "Confidential reporting" } }),
    ]);
    for (const role of roles) {
      const canAll = ["SUPER_ADMIN", "ORG_ADMIN", "MODULE_ADMIN"].includes(role.type);
      const canWrite = canAll || role.type === "CONTRIBUTOR";
      const canView = canAll || canWrite || role.type === "VIEWER";
      for (const mod of modules) {
        await prisma.permission.create({ data: { roleId: role.id, moduleId: mod.id, canView, canCreate: canWrite, canEdit: canWrite, canDelete: canAll } });
      }
    }
    console.log("Created", roles.length, "roles and", modules.length, "modules\n");
  }

  const superAdminRole = roles.find((r) => r.type === "SUPER_ADMIN");
  const orgAdminRole = roles.find((r) => r.type === "ORG_ADMIN");
  const viewerRole = roles.find((r) => r.type === "VIEWER");
  const respondentRole = roles.find((r) => r.type === "RESPONDENT");

  if (!superAdminRole || !orgAdminRole) throw new Error("Required roles not found");

  const password = await bcrypt.hash("Inspire@2026", 12);

  // === CREATE TRUCORE LTD (Super Admin Org) ===
  let trucoreOrg = await prisma.organization.findUnique({ where: { slug: "trucore-ltd" } });
  if (!trucoreOrg) {
    trucoreOrg = await prisma.organization.create({ data: { name: "TRUCORE Ltd.", slug: "trucore-ltd" } });
    await prisma.brandingConfig.create({ data: { organizationId: trucoreOrg.id, companyName: "TRUCORE Ltd." } });
    for (const mod of modules) {
      await prisma.organizationModule.create({ data: { organizationId: trucoreOrg.id, moduleId: mod.id, isEnabled: true } });
    }
    console.log("Created org: TRUCORE Ltd.");
  }

  let superAdmin = await prisma.user.findUnique({ where: { email: "superadmin@trucore.com" } });
  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: { name: "Super Admin", email: "superadmin@trucore.com", password, isActive: true },
    });
    await prisma.membership.create({ data: { userId: superAdmin.id, organizationId: trucoreOrg.id, roleId: superAdminRole.id } });
    console.log("Created user: superadmin@trucore.com / Inspire@2026 (Super Admin)");
  }

  // === CREATE RITE FOODS ===
  let riteFoods = await prisma.organization.findUnique({ where: { slug: "rite-foods" } });
  if (!riteFoods) {
    riteFoods = await prisma.organization.create({ data: { name: "Rite Foods", slug: "rite-foods" } });
    await prisma.brandingConfig.create({ data: { organizationId: riteFoods.id, companyName: "Rite Foods", primaryColor: "#059669", secondaryColor: "#10B981", accentColor: "#A7F3D0" } });
    for (const mod of modules) {
      await prisma.organizationModule.create({ data: { organizationId: riteFoods.id, moduleId: mod.id, isEnabled: true } });
    }
    console.log("Created org: Rite Foods");
  }

  // Rite Foods Users
  let adminUser = await prisma.user.findUnique({ where: { email: "admin@ritefoods.com" } });
  if (!adminUser) {
    adminUser = await prisma.user.create({ data: { name: "Jane Doe", email: "admin@ritefoods.com", password, isActive: true } });
    await prisma.membership.create({ data: { userId: adminUser.id, organizationId: riteFoods.id, roleId: orgAdminRole.id } });
  }

  let viewerUser = await prisma.user.findUnique({ where: { email: "viewer@ritefoods.com" } });
  if (!viewerUser) {
    viewerUser = await prisma.user.create({ data: { name: "John Smith", email: "viewer@ritefoods.com", password, isActive: true } });
    await prisma.membership.create({ data: { userId: viewerUser.id, organizationId: riteFoods.id, roleId: viewerRole.id } });
  }

  let respondentUser = await prisma.user.findUnique({ where: { email: "respondent@ritefoods.com" } });
  if (!respondentUser) {
    respondentUser = await prisma.user.create({ data: { name: "Alice Johnson", email: "respondent@ritefoods.com", password, isActive: true } });
    await prisma.membership.create({ data: { userId: respondentUser.id, organizationId: riteFoods.id, roleId: respondentRole.id } });
  }

  console.log("Created 3 users for Rite Foods (admin/viewer/respondent)");

  // === SAMPLE GENERAL SURVEYS ===
  const existingSurveys = await prisma.generalSurvey.count({ where: { organizationId: riteFoods.id } });
  if (existingSurveys === 0) {
    const engSurvey = await prisma.generalSurvey.create({
      data: {
        organizationId: riteFoods.id, title: "Employee Engagement Survey Q2 2026", description: "Help us understand how you feel about working at Rite Foods. Your feedback drives positive change.",
        category: "Employee Engagement", formStyle: "NOTION", status: "PUBLISHED", isPublic: true, createdById: adminUser.id,
        questions: {
          create: [
            { type: "RATING_SCALE", title: "How satisfied are you with your role?", required: true, order: 0 },
            { type: "MULTIPLE_CHOICE", title: "What department do you work in?", required: true, order: 1, options: "Operations\nFinance\nHR\nMarketing\nSales\nIT\nManagement" },
            { type: "YES_NO", title: "Do you feel valued at work?", required: true, order: 2 },
            { type: "LONG_TEXT", title: "What improvements would you suggest?", required: false, order: 3 },
            { type: "DROPDOWN", title: "How long have you been with the company?", required: true, order: 4, options: "Less than 1 year\n1-3 years\n3-5 years\n5-10 years\nOver 10 years" },
          ],
        },
      },
    });

    const cultureSurvey = await prisma.generalSurvey.create({
      data: {
        organizationId: riteFoods.id, title: "Workplace Culture Assessment", description: "We want to ensure our workplace culture is inclusive, supportive, and empowering.",
        category: "Workplace Culture", formStyle: "TYPEFORM", status: "PUBLISHED", isPublic: true, createdById: adminUser.id,
        questions: {
          create: [
            { type: "YES_NO", title: "Do you feel included in team discussions?", required: true, order: 0 },
            { type: "RATING_SCALE", title: "Rate work-life balance", required: true, order: 1 },
            { type: "CHECKBOX", title: "Which benefits matter most to you?", required: false, order: 2, options: "Health Insurance\nRemote Work\nFlexible Hours\nTraining & Development\nGym Membership" },
            { type: "SHORT_TEXT", title: "One word to describe our culture", required: false, order: 3 },
          ],
        },
      },
    });

    // Sample responses
    await prisma.generalSurveyResponse.create({
      data: { surveyId: engSurvey.id, userId: respondentUser.id, answers: { create: [
        { questionId: (await prisma.generalSurveyQuestion.findFirst({ where: { surveyId: engSurvey.id, order: 0 } }))!.id, value: "4" },
        { questionId: (await prisma.generalSurveyQuestion.findFirst({ where: { surveyId: engSurvey.id, order: 1 } }))!.id, value: "Operations" },
        { questionId: (await prisma.generalSurveyQuestion.findFirst({ where: { surveyId: engSurvey.id, order: 2 } }))!.id, value: "Yes" },
        { questionId: (await prisma.generalSurveyQuestion.findFirst({ where: { surveyId: engSurvey.id, order: 3 } }))!.id, value: "More team building activities would be great!" },
        { questionId: (await prisma.generalSurveyQuestion.findFirst({ where: { surveyId: engSurvey.id, order: 4 } }))!.id, value: "1-3 years" },
      ]} },
    });

    console.log("Created 2 general surveys with sample responses");
  }

  // === SAMPLE ANONYMOUS SURVEYS ===
  const existingAnon = await prisma.anonymousSurvey.count({ where: { organizationId: riteFoods.id } });
  if (existingAnon === 0) {
    const anonSurvey = await prisma.anonymousSurvey.create({
      data: {
        organizationId: riteFoods.id, title: "Anonymous Feedback - Management", description: "Share your honest thoughts about management. Completely anonymous.",
        category: "Leadership Feedback", formStyle: "NOTION", status: "PUBLISHED",
        questions: {
          create: [
            { type: "RATING_SCALE", title: "How transparent is management?", required: true, order: 0 },
            { type: "YES_NO", title: "Do you trust senior leadership?", required: true, order: 1 },
            { type: "LONG_TEXT", title: "Any concerns you want to raise anonymously?", required: false, order: 2 },
            { type: "MULTIPLE_CHOICE", title: "What area needs most improvement?", required: true, order: 3, options: "Communication\nCompensation\nCareer Growth\nWorkload\nRecognition" },
          ],
        },
      },
    });

    await prisma.anonymousSurveyResponse.create({
      data: { surveyId: anonSurvey.id, token: "demo-" + require("crypto").randomBytes(8).toString("hex"), answers: { create: [
        { questionId: (await prisma.anonymousSurveyQuestion.findFirst({ where: { surveyId: anonSurvey.id, order: 0 } }))!.id, value: "3" },
        { questionId: (await prisma.anonymousSurveyQuestion.findFirst({ where: { surveyId: anonSurvey.id, order: 1 } }))!.id, value: "No" },
        { questionId: (await prisma.anonymousSurveyQuestion.findFirst({ where: { surveyId: anonSurvey.id, order: 2 } }))!.id, value: "Middle management needs better training on people management skills." },
        { questionId: (await prisma.anonymousSurveyQuestion.findFirst({ where: { surveyId: anonSurvey.id, order: 3 } }))!.id, value: "Communication" },
      ]} },
    });

    console.log("Created 1 anonymous survey with sample response");
  }

  // === SAMPLE WHISTLEBLOWING CASES ===
  const existingCases = await prisma.case.count({ where: { organizationId: riteFoods.id } });
  if (existingCases === 0) {
    const case1 = await prisma.case.create({
      data: {
        caseId: "TC-" + Date.now().toString(36).toUpperCase() + "-A1B2", organizationId: riteFoods.id,
        title: "Suspected Financial Irregularity in Procurement", description: "I have noticed discrepancies in procurement invoices dating back several months. Payments seem to be going to a vendor that does not appear to be legitimate. I have attached supporting documents.",
        category: "Financial Irregularities", status: "UNDER_REVIEW", priority: "high", isAnonymous: true,
      },
    });

    await prisma.caseMessage.create({
      data: { caseId: case1.id, content: "Thank you for your report. We have assigned a senior investigator to review the procurement records. We will update you within 48 hours.", isFromReporter: false, senderId: adminUser.id },
    });

    const case2 = await prisma.case.create({
      data: {
        caseId: "TC-" + Date.now().toString(36).toUpperCase() + "-C3D4", organizationId: riteFoods.id,
        title: "Workplace Harassment Concern", description: "A colleague has been making inappropriate comments. I have spoken to my direct supervisor but nothing has changed. I am filing this report as a formal complaint.",
        category: "Harassment", status: "SUBMITTED", priority: "critical", isAnonymous: true,
      },
    });

    const resolvedCase = await prisma.case.create({
      data: {
        caseId: "TC-" + Date.now().toString(36).toUpperCase() + "-E5F6", organizationId: riteFoods.id,
        title: "Safety Hazard in Production Area", description: "Reported a faulty machine that was causing safety concerns in the production area. Issue has been resolved.", status: "RESOLVED", priority: "normal", isAnonymous: false, reporterName: "Alice Johnson",
      },
    });

    console.log("Created 3 whistleblowing cases with messages");
  }

  // === AUDIT LOGS ===
  const existingLogs = await prisma.auditLog.count({ where: { organizationId: riteFoods.id } });
  if (existingLogs === 0) {
    await prisma.auditLog.create({ data: { organizationId: riteFoods.id, userId: adminUser.id, action: "CREATE", entityType: "GeneralSurvey", entityId: "sample-1", metadata: JSON.stringify({ title: "Employee Engagement Survey Q2 2026" }) } });
    await prisma.auditLog.create({ data: { organizationId: riteFoods.id, userId: adminUser.id, action: "CREATE", entityType: "AnonymousSurvey", entityId: "sample-2", metadata: JSON.stringify({ title: "Anonymous Feedback - Management" }) } });
    await prisma.auditLog.create({ data: { organizationId: riteFoods.id, userId: adminUser.id, action: "CREATE", entityType: "Case", entityId: "sample-3", metadata: JSON.stringify({ title: "Financial Irregularity" }) } });
    console.log("Created 3 audit log entries");
  }

  console.log("\n=== SEED COMPLETE ===");
  console.log("Organizations: TRUCORE Ltd., Rite Foods");
  console.log("Users:");
  console.log("  superadmin@trucore.com / Inspire@2026 (Super Admin - TRUCORE Ltd.)");
  console.log("  admin@ritefoods.com / Inspire@2026 (Org Admin - Rite Foods)");
  console.log("  viewer@ritefoods.com / Inspire@2026 (Viewer - Rite Foods)");
  console.log("  respondent@ritefoods.com / Inspire@2026 (Respondent - Rite Foods)");
  console.log("Sample data: 2 general surveys, 1 anonymous survey, 3 whistleblowing cases");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
