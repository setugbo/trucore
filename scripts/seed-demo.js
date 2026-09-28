require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
if (!SEED_PASSWORD) {
  console.error(
    "SEED_ADMIN_PASSWORD is not set. Set it in your environment before seeding demo accounts " +
    "(e.g. SEED_ADMIN_PASSWORD='a-strong-password' npm run db:seed:demo)."
  );
  process.exit(1);
}

async function main() {
  console.log("Seeding TRUCORE with demo data...\n");

  let roles = await prisma.role.findMany();
  let modules = await prisma.module.findMany();

  if (roles.length === 0) {
    console.log("Initializing roles...");
    roles = await Promise.all([
      prisma.role.create({ data: { name: "System Admin", type: "SYSTEM_ADMIN", description: "Full access within an organization" } }),
      prisma.role.create({ data: { name: "Module Admin", type: "MODULE_ADMIN", description: "Can manage specific modules" } }),
      prisma.role.create({ data: { name: "Viewer", type: "VIEWER", description: "Read-only access" } }),
    ]);
  }
  if (modules.length === 0) {
    console.log("Initializing modules...");
    modules = await Promise.all([
      prisma.module.create({ data: { type: "GENERAL_SURVEY", name: "General Surveys", description: "Standard internal surveys" } }),
      prisma.module.create({ data: { type: "ANONYMOUS_SURVEY", name: "Anonymous Surveys", description: "Anonymous feedback collection" } }),
      prisma.module.create({ data: { type: "WHISTLEBLOWING", name: "Whistleblowing", description: "Confidential whistleblowing reports" } }),
    ]);
  }

  const systemAdminRole = roles.find((r) => r.type === "SYSTEM_ADMIN");
  const viewerRole = roles.find((r) => r.type === "VIEWER");
  if (!systemAdminRole || !viewerRole) throw new Error("Required roles not found");

  const password = await bcrypt.hash(SEED_PASSWORD, 12);

  // === CREATE TRUCORE (platform/vendor org) ===
  let trucoreOrg = await prisma.organization.findUnique({ where: { slug: "trucore" } });
  if (!trucoreOrg) {
    trucoreOrg = await prisma.organization.create({ data: { name: "TRUCORE", slug: "trucore", publicReportSlug: "report" } });
    await prisma.brandingConfig.create({ data: { organizationId: trucoreOrg.id, companyName: "TRUCORE" } });
    console.log("Created org: TRUCORE");
  }

  let platformAdmin = await prisma.user.findUnique({ where: { email: "superadmin@trucore.com" } });
  if (!platformAdmin) {
    platformAdmin = await prisma.user.create({
      data: { name: "Platform Admin", email: "superadmin@trucore.com", password, isActive: true, isPlatformAdmin: true },
    });
    await prisma.membership.create({ data: { userId: platformAdmin.id, organizationId: trucoreOrg.id, roleId: systemAdminRole.id } });
    console.log(`Created platform admin: superadmin@trucore.com / ${SEED_PASSWORD}`);
  }

  // === CREATE RITE FOODS (demo customer org) ===
  let riteFoods = await prisma.organization.findUnique({ where: { slug: "rite-foods" } });
  if (!riteFoods) {
    riteFoods = await prisma.organization.create({ data: { name: "Rite Foods", slug: "rite-foods" } });
    await prisma.brandingConfig.create({ data: { organizationId: riteFoods.id, companyName: "Rite Foods", primaryColor: "#059669", secondaryColor: "#10B981", accentColor: "#A7F3D0" } });
    console.log("Created org: Rite Foods");
  }

  let adminUser = await prisma.user.findUnique({ where: { email: "admin@ritefoods.com" } });
  if (!adminUser) {
    adminUser = await prisma.user.create({ data: { name: "Jane Doe", email: "admin@ritefoods.com", password, isActive: true } });
    await prisma.membership.create({ data: { userId: adminUser.id, organizationId: riteFoods.id, roleId: systemAdminRole.id } });
  }

  let viewerUser = await prisma.user.findUnique({ where: { email: "viewer@ritefoods.com" } });
  if (!viewerUser) {
    viewerUser = await prisma.user.create({ data: { name: "John Smith", email: "viewer@ritefoods.com", password, isActive: true } });
    await prisma.membership.create({ data: { userId: viewerUser.id, organizationId: riteFoods.id, roleId: viewerRole.id } });
    for (const mod of modules) {
      await prisma.userModulePermission.create({
        data: { userId: viewerUser.id, organizationId: riteFoods.id, moduleId: mod.id, canView: true, canCreate: false, canEdit: false, canDelete: false },
      });
    }
  }

  let respondentUser = await prisma.user.findUnique({ where: { email: "respondent@ritefoods.com" } });
  if (!respondentUser) {
    respondentUser = await prisma.user.create({ data: { name: "Alice Johnson", email: "respondent@ritefoods.com", password, isActive: true } });
    await prisma.membership.create({ data: { userId: respondentUser.id, organizationId: riteFoods.id, roleId: viewerRole.id } });
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

    await prisma.generalSurvey.create({
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

    const q0 = await prisma.generalSurveyQuestion.findFirst({ where: { surveyId: engSurvey.id, order: 0 } });
    const q1 = await prisma.generalSurveyQuestion.findFirst({ where: { surveyId: engSurvey.id, order: 1 } });
    const q2 = await prisma.generalSurveyQuestion.findFirst({ where: { surveyId: engSurvey.id, order: 2 } });
    const q3 = await prisma.generalSurveyQuestion.findFirst({ where: { surveyId: engSurvey.id, order: 3 } });
    const q4 = await prisma.generalSurveyQuestion.findFirst({ where: { surveyId: engSurvey.id, order: 4 } });

    await prisma.generalSurveyResponse.create({
      data: { surveyId: engSurvey.id, userId: respondentUser.id, answers: { create: [
        { questionId: q0.id, value: "4" },
        { questionId: q1.id, value: "Operations" },
        { questionId: q2.id, value: "Yes" },
        { questionId: q3.id, value: "More team building activities would be great!" },
        { questionId: q4.id, value: "1-3 years" },
      ] } },
    });

    console.log("Created 2 general surveys with sample responses");
  }

  // === SAMPLE ANONYMOUS SURVEYS ===
  const existingAnon = await prisma.anonymousSurvey.count({ where: { organizationId: riteFoods.id } });
  if (existingAnon === 0) {
    const anonSurvey = await prisma.anonymousSurvey.create({
      data: {
        organizationId: riteFoods.id, title: "Anonymous Feedback - Management", description: "Share your honest thoughts about management. Completely anonymous.",
        category: "Leadership Feedback", formStyle: "NOTION", status: "PUBLISHED", publicLink: "demo-mgmt-feedback",
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

    const q0 = await prisma.anonymousSurveyQuestion.findFirst({ where: { surveyId: anonSurvey.id, order: 0 } });
    const q1 = await prisma.anonymousSurveyQuestion.findFirst({ where: { surveyId: anonSurvey.id, order: 1 } });
    const q2 = await prisma.anonymousSurveyQuestion.findFirst({ where: { surveyId: anonSurvey.id, order: 2 } });
    const q3 = await prisma.anonymousSurveyQuestion.findFirst({ where: { surveyId: anonSurvey.id, order: 3 } });

    await prisma.anonymousSurveyResponse.create({
      data: { surveyId: anonSurvey.id, token: "demo-" + crypto.randomBytes(8).toString("hex"), answers: { create: [
        { questionId: q0.id, value: "3" },
        { questionId: q1.id, value: "No" },
        { questionId: q2.id, value: "Middle management needs better training on people management skills." },
        { questionId: q3.id, value: "Communication" },
      ] } },
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
        reporterToken: "TC-" + crypto.randomInt(100000, 999999) + "-DEMO0001",
      },
    });

    await prisma.caseMessage.create({
      data: { caseId: case1.id, content: "Thank you for your report. We have assigned a senior investigator to review the procurement records. We will update you within 48 hours.", isFromReporter: false, senderId: adminUser.id },
    });

    await prisma.case.create({
      data: {
        caseId: "TC-" + Date.now().toString(36).toUpperCase() + "-C3D4", organizationId: riteFoods.id,
        title: "Workplace Harassment Concern", description: "A colleague has been making inappropriate comments. I have spoken to my direct supervisor but nothing has changed. I am filing this report as a formal complaint.",
        category: "Harassment", status: "SUBMITTED", priority: "critical", isAnonymous: true,
        reporterToken: "TC-" + crypto.randomInt(100000, 999999) + "-DEMO0002",
      },
    });

    await prisma.case.create({
      data: {
        caseId: "TC-" + Date.now().toString(36).toUpperCase() + "-E5F6", organizationId: riteFoods.id,
        title: "Safety Hazard in Production Area", description: "Reported a faulty machine that was causing safety concerns in the production area. Issue has been resolved.", status: "RESOLVED", priority: "normal", isAnonymous: false, reporterName: "Alice Johnson",
        reporterToken: "TC-" + crypto.randomInt(100000, 999999) + "-DEMO0003",
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
  console.log("Organizations: TRUCORE (platform), Rite Foods (demo customer)");
  console.log("Users (all share the SEED_ADMIN_PASSWORD you set):");
  console.log("  superadmin@trucore.com (Platform Admin - TRUCORE)");
  console.log("  admin@ritefoods.com (Org Admin - Rite Foods)");
  console.log("  viewer@ritefoods.com (Viewer - Rite Foods)");
  console.log("  respondent@ritefoods.com (Viewer - Rite Foods)");
  console.log("Sample data: 2 general surveys, 1 anonymous survey, 3 whistleblowing cases");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
