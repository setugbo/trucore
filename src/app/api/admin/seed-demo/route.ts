import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function ensureRoles() {
  let roles = await prisma.role.findMany();
  if (roles.length === 0) {
    await prisma.role.createMany({
      data: [
        { name: "System Admin", type: "SYSTEM_ADMIN", description: "Full system access" },
        { name: "Module Admin", type: "MODULE_ADMIN", description: "Can manage specific modules" },
        { name: "Viewer", type: "VIEWER", description: "Read-only access" },
      ],
    });
    roles = await prisma.role.findMany();
  }
  return roles;
}

export async function GET() {
  try {
    // Clean ALL data
    const tables = ["caseMessage","caseAttachment","case","generalSurveyAnswer","generalSurveyResponse","generalSurveyQuestion","generalSurvey","anonymousSurveyAnswer","anonymousSurveyResponse","anonymousSurveyQuestion","anonymousSurvey","auditLog","notification","brandingConfig","membership","session","account","organization","user"];
    for (const t of tables) { try { await (prisma as any)[t].deleteMany(); } catch {} }

    const roles = await ensureRoles();
    const saRole = roles.find((r: any) => r.type === "SYSTEM_ADMIN")!;
    const maRole = roles.find((r: any) => r.type === "MODULE_ADMIN")!;
    const vRole = roles.find((r: any) => r.type === "VIEWER")!;

    // Seed modules
    const moduleTypes = ["GENERAL_SURVEY", "ANONYMOUS_SURVEY", "WHISTLEBLOWING"];
    const moduleNames = ["General Surveys", "Anonymous Surveys", "Whistleblowing"];
    const moduleDescs = ["Standard internal surveys", "Anonymous feedback collection", "Confidential whistleblowing reports"];

    let modules = await prisma.module.findMany();
    if (modules.length === 0) {
      for (let i = 0; i < 3; i++) {
        await prisma.module.create({ data: { type: moduleTypes[i], name: moduleNames[i], description: moduleDescs[i] } });
      }
      modules = await prisma.module.findMany();
    }

    const pw = await bcrypt.hash("Inspire@2026", 12);
    const crypto = require("crypto");

    // === ORGANIZATION ===
    const org = await prisma.organization.create({
      data: { name: "TRUCORE", slug: "trucore", publicReportSlug: "report" },
    });
    await prisma.brandingConfig.create({
      data: { organizationId: org.id, companyName: "TRUCORE", primaryColor: "#5B21B6", secondaryColor: "#7C3AED", accentColor: "#C4B5FD" },
    });

    // === USERS ===
    const admin = await prisma.user.create({
      data: { name: "System Administrator", email: "trucore@itadvisoryprojects.com.ng", password: pw, isActive: true },
    });
    await prisma.membership.create({ data: { userId: admin.id, organizationId: org.id, roleId: saRole.id } });
    for (const mod of modules) {
      await prisma.userModulePermission.create({
        data: { userId: admin.id, organizationId: org.id, moduleId: mod.id, canView: true, canCreate: true, canEdit: true, canDelete: true }
      });
    }

    const modAdmin = await prisma.user.create({
      data: { name: "Module Manager", email: "module@trucore.com", password: pw, isActive: true },
    });
    await prisma.membership.create({ data: { userId: modAdmin.id, organizationId: org.id, roleId: maRole.id } });
    for (const mod of modules) {
      await prisma.userModulePermission.create({
        data: { userId: modAdmin.id, organizationId: org.id, moduleId: mod.id, canView: true, canCreate: true, canEdit: true, canDelete: true }
      });
    }

    const viewer = await prisma.user.create({
      data: { name: "Report Viewer", email: "viewer@trucore.com", password: pw, isActive: true },
    });
    await prisma.membership.create({ data: { userId: viewer.id, organizationId: org.id, roleId: vRole.id } });
    for (const mod of modules) {
      await prisma.userModulePermission.create({
        data: { userId: viewer.id, organizationId: org.id, moduleId: mod.id, canView: true, canCreate: false, canEdit: false, canDelete: false }
      });
    }

    // === GENERAL SURVEYS ===
    const s1 = await prisma.generalSurvey.create({
      data: { organizationId: org.id, title: "Employee Engagement Survey 2026", description: "Help us understand how you feel about working here. Your feedback drives positive change across the organization.", category: "Employee Engagement", formStyle: "NOTION", status: "PUBLISHED", isPublic: true, publicLink: crypto.randomBytes(8).toString("hex"), createdById: admin.id },
    });
    const s1q = [
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s1.id, type: "RATING_SCALE", title: "How satisfied are you with your current role?", required: true, order: 0 } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s1.id, type: "MULTIPLE_CHOICE", title: "Which department do you work in?", required: true, order: 1, options: "Operations\nFinance\nHuman Resources\nMarketing\nSales\nIT\nManagement" } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s1.id, type: "YES_NO", title: "Do you feel valued at work?", required: true, order: 2 } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s1.id, type: "DROPDOWN", title: "How long have you been here?", required: true, order: 3, options: "Less than 1 year\n1-3 years\n3-5 years\n5+ years" } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s1.id, type: "LONG_TEXT", title: "What improvements would you suggest?", required: false, order: 4 } }),
    ];
    await prisma.generalSurveyResponse.create({ data: { surveyId: s1.id, userId: viewer.id, answers: { create: [
      { questionId: s1q[0].id, value: "4" }, { questionId: s1q[1].id, value: "Operations" }, { questionId: s1q[2].id, value: "Yes" }, { questionId: s1q[3].id, value: "1-3 years" }, { questionId: s1q[4].id, value: "More team collaboration and flexible hours would be great." },
    ]}}});

    const s2 = await prisma.generalSurvey.create({
      data: { organizationId: org.id, title: "Workplace Culture Pulse Check", description: "Quick monthly check on workplace culture and inclusion.", category: "Workplace Culture", formStyle: "TYPEFORM", status: "PUBLISHED", isPublic: true, publicLink: crypto.randomBytes(8).toString("hex"), createdById: modAdmin.id },
    });
    const s2q = [
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s2.id, type: "YES_NO", title: "Do you feel included in team decisions?", required: true, order: 0 } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s2.id, type: "RATING_SCALE", title: "Rate work-life balance (1-5)", required: true, order: 1 } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s2.id, type: "CHECKBOX", title: "Which benefits matter most?", required: false, order: 2, options: "Health Insurance\nRemote Work\nFlexible Hours\nTraining\nGym" } }),
    ];

    // Draft survey
    await prisma.generalSurvey.create({
      data: { organizationId: org.id, title: "Q3 Performance Review", description: "Draft survey for next quarter.", category: "Performance Review", formStyle: "CLASSIC", status: "DRAFT", createdById: admin.id },
    });

    // === ANONYMOUS SURVEY ===
    const anon = await prisma.anonymousSurvey.create({
      data: { organizationId: org.id, title: "Anonymous Leadership Feedback", description: "Share honest thoughts about management. Completely anonymous.", category: "Leadership Feedback", formStyle: "NOTION", status: "PUBLISHED", publicLink: crypto.randomBytes(8).toString("hex") },
    });
    const aq = [
      await prisma.anonymousSurveyQuestion.create({ data: { surveyId: anon.id, type: "RATING_SCALE", title: "How transparent is management?", required: true, order: 0 } }),
      await prisma.anonymousSurveyQuestion.create({ data: { surveyId: anon.id, type: "YES_NO", title: "Do you trust leadership?", required: true, order: 1 } }),
      await prisma.anonymousSurveyQuestion.create({ data: { surveyId: anon.id, type: "MULTIPLE_CHOICE", title: "Area needing most improvement?", required: true, order: 2, options: "Communication\nCompensation\nCareer Growth\nWorkload\nRecognition" } }),
      await prisma.anonymousSurveyQuestion.create({ data: { surveyId: anon.id, type: "LONG_TEXT", title: "Any concerns to raise?", required: false, order: 3 } }),
    ];
    await prisma.anonymousSurveyResponse.create({
      data: { surveyId: anon.id, token: crypto.randomBytes(12).toString("hex"), answers: { create: [
        { questionId: aq[0].id, value: "3" }, { questionId: aq[1].id, value: "No" }, { questionId: aq[2].id, value: "Communication" }, { questionId: aq[3].id, value: "Middle management needs better people skills training." },
      ]}},
    });

    // === WHISTLEBLOWING CASES ===
    const c1 = await prisma.case.create({
      data: { caseId: "TC-" + crypto.randomBytes(4).toString("hex").toUpperCase(), organizationId: org.id, title: "Suspected Financial Irregularity", description: "Discrepancies in procurement invoices over several months. Payments appear directed to a potentially fraudulent vendor.", category: "Financial Irregularities", status: "UNDER_REVIEW", priority: "high", isAnonymous: true, reporterToken: "TC-" + Math.floor(100000 + Math.random() * 900000) + "-ABCD" },
    });
    await prisma.caseMessage.create({ data: { caseId: c1.id, content: "Thank you for your report. A senior investigator has been assigned. We will update you within 48 hours.", isFromReporter: false, senderId: admin.id } });

    await prisma.case.create({
      data: { caseId: "TC-" + crypto.randomBytes(4).toString("hex").toUpperCase(), organizationId: org.id, title: "Workplace Harassment Complaint", description: "Inappropriate behavior from a colleague. Issue reported to supervisor but not addressed.", category: "Harassment", status: "SUBMITTED", priority: "critical", isAnonymous: true, reporterToken: "TC-" + Math.floor(100000 + Math.random() * 900000) + "-EFGH" },
    });

    await prisma.case.create({
      data: { caseId: "TC-" + crypto.randomBytes(4).toString("hex").toUpperCase(), organizationId: org.id, title: "Safety Hazard - Resolved", description: "Faulty equipment in production area. Issue identified and fixed.", category: "Safety Concerns", status: "RESOLVED", priority: "normal", isAnonymous: false, reporterName: "Anonymous Reporter" },
    });

    // === AUDIT LOGS ===
    await prisma.auditLog.create({ data: { organizationId: org.id, userId: admin.id, action: "DEMO_SEED", entityType: "System", metadata: JSON.stringify({ message: "Demo data seeded" }) } });
    await prisma.auditLog.create({ data: { organizationId: org.id, userId: admin.id, action: "CREATE", entityType: "GeneralSurvey", entityId: s1.id, metadata: JSON.stringify({ title: "Employee Engagement Survey 2026" }) } });
    await prisma.auditLog.create({ data: { organizationId: org.id, userId: admin.id, action: "CREATE", entityType: "Case", entityId: c1.id, metadata: JSON.stringify({ title: "Financial Irregularity" }) } });

    return new Response(
      `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;margin:0">
<div style="max-width:560px;width:100%;padding:2.5rem;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="width:56px;height:56px;border-radius:16px;background:#5B21B6;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
    <span style="color:white;font-size:24px;font-weight:800">TC</span>
  </div>
  <h1 style="font-size:24px;font-weight:700;text-align:center;margin:0 0 4px">Demo Data Seeded</h1>
  <p style="color:#64748b;font-size:14px;text-align:center;margin:0 0 20px">All sample data loaded successfully</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px">

  <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-weight:600;margin:0 0 8px;color:#5B21B6;font-size:15px">System Administrator</p>
    <p style="margin:0;font-family:monospace;font-size:14px;background:#1e293b;color:#e2e8f0;padding:10px 14px;border-radius:6px;word-break:break-all">trucore@itadvisoryprojects.com.ng / Inspire@2026</p>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
    <div style="background:#f5f3ff;border-radius:8px;padding:12px;text-align:center"><p style="font-size:20px;font-weight:700;color:#5B21B6;margin:0">3</p><p style="font-size:11px;color:#6d28d9;margin:0">Users</p></div>
    <div style="background:#f0fdf4;border-radius:8px;padding:12px;text-align:center"><p style="font-size:20px;font-weight:700;color:#059669;margin:0">3</p><p style="font-size:11px;color:#059669;margin:0">Surveys</p></div>
    <div style="background:#fef3c7;border-radius:8px;padding:12px;text-align:center"><p style="font-size:20px;font-weight:700;color:#d97706;margin:0">3</p><p style="font-size:11px;color:#d97706;margin:0">Cases</p></div>
  </div>

  <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-weight:600;margin:0 0 12px;font-size:13px;color:#475569">Sample Data Created</p>
    <div style="font-size:13px;color:#64748b;line-height:1.8">
      <p style="margin:2px 0">✓ <strong>3 users</strong> — System Admin, Module Admin, Viewer</p>
      <p style="margin:2px 0">✓ <strong>3 general surveys</strong> — 2 published, 1 draft (with responses)</p>
      <p style="margin:2px 0">✓ <strong>1 anonymous survey</strong> — with sample anonymous response</p>
      <p style="margin:2px 0">✓ <strong>3 whistleblowing cases</strong> — Under Review, Submitted, Resolved</p>
      <p style="margin:2px 0">✓ <strong>Audit logs</strong> — Sample activity trail</p>
    </div>
  </div>

  <a href="/login" style="display:block;text-align:center;padding:12px 32px;background:#5B21B6;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Sign In to TRUCORE</a>
</div></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    return new Response(`<html><body><h1 style="color:#dc2626">Seed Failed</h1><pre>${error.message}</pre></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } });
  }
}
