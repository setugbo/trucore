import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function ensureRoles() {
  let roles = await prisma.role.findMany();
  let modules = await prisma.module.findMany();
  if (roles.length === 0) {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://trucore.vercel.app"}/api/admin/setup`, { method: "POST" });
    roles = await prisma.role.findMany();
    modules = await prisma.module.findMany();
  }
  return { roles, modules };
}

export async function GET() {
  try {
    // Clean all existing data first
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.generalSurveyAnswer.deleteMany();
    await prisma.generalSurveyResponse.deleteMany();
    await prisma.generalSurveyQuestion.deleteMany();
    await prisma.generalSurvey.deleteMany();
    await prisma.anonymousSurveyAnswer.deleteMany();
    await prisma.anonymousSurveyResponse.deleteMany();
    await prisma.anonymousSurveyQuestion.deleteMany();
    await prisma.anonymousSurvey.deleteMany();
    await prisma.caseMessage.deleteMany();
    await prisma.caseAttachment.deleteMany();
    await prisma.case.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.brandingConfig.deleteMany();
    await prisma.organizationModule.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    console.log("Cleaned all existing data");

    const { roles, modules } = await ensureRoles();
    const sar = roles.find((r: any) => r.type === "SUPER_ADMIN")!;
    const oar = roles.find((r: any) => r.type === "ORG_ADMIN")!;
    const vr = roles.find((r: any) => r.type === "VIEWER")!;
    const rr = roles.find((r: any) => r.type === "RESPONDENT")!;

    const pw = await bcrypt.hash("Inspire@2026", 12);
    const crypto = require("crypto");

    // === TRUCORE LTD ===
    const trucoreOrg = await prisma.organization.create({ data: { name: "TRUCORE Ltd.", slug: "trucore-ltd" } });
    await prisma.brandingConfig.create({ data: { organizationId: trucoreOrg.id, companyName: "TRUCORE Ltd." } });
    for (const m of modules) await prisma.organizationModule.create({ data: { organizationId: trucoreOrg.id, moduleId: m.id, isEnabled: true } });
    const sa = await prisma.user.create({ data: { name: "Super Admin", email: "superadmin@trucore.com", password: pw, isActive: true } });
    await prisma.membership.create({ data: { userId: sa.id, organizationId: trucoreOrg.id, roleId: sar.id } });

    // === RITE FOODS ===
    const rf = await prisma.organization.create({ data: { name: "Rite Foods", slug: "rite-foods" } });
    await prisma.brandingConfig.create({ data: { organizationId: rf.id, companyName: "Rite Foods", primaryColor: "#059669", secondaryColor: "#10B981", accentColor: "#A7F3D0" } });
    for (const m of modules) await prisma.organizationModule.create({ data: { organizationId: rf.id, moduleId: m.id, isEnabled: true } });

    const adminU = await prisma.user.create({ data: { name: "Jane Doe (Admin)", email: "admin@ritefoods.com", password: pw, isActive: true } });
    await prisma.membership.create({ data: { userId: adminU.id, organizationId: rf.id, roleId: oar.id } });
    const viewerU = await prisma.user.create({ data: { name: "John Smith (Viewer)", email: "viewer@ritefoods.com", password: pw, isActive: true } });
    await prisma.membership.create({ data: { userId: viewerU.id, organizationId: rf.id, roleId: vr.id } });
    const respU = await prisma.user.create({ data: { name: "Alice Johnson (Respondent)", email: "respondent@ritefoods.com", password: pw, isActive: true } });
    await prisma.membership.create({ data: { userId: respU.id, organizationId: rf.id, roleId: rr.id } });

    // === GENERAL SURVEYS ===
    // Survey 1: Employee Engagement (NOTION style)
    const s1 = await prisma.generalSurvey.create({
      data: {
        organizationId: rf.id, title: "Employee Engagement Survey Q2 2026",
        description: "Help us understand how you feel about working at Rite Foods. Your feedback is valuable and drives positive change across the organization.",
        category: "Employee Engagement", formStyle: "NOTION", status: "PUBLISHED", isPublic: true,
        publicLink: crypto.randomBytes(8).toString("hex"), createdById: adminU.id,
      },
    });
    const s1q = [
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s1.id, type: "RATING_SCALE", title: "How satisfied are you with your current role?", required: true, order: 0 } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s1.id, type: "MULTIPLE_CHOICE", title: "Which department do you work in?", required: true, order: 1, options: "Operations\nFinance\nHuman Resources\nMarketing\nSales\nInformation Technology\nManagement" } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s1.id, type: "YES_NO", title: "Do you feel valued and recognized for your contributions?", required: true, order: 2 } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s1.id, type: "DROPDOWN", title: "How long have you been employed here?", required: true, order: 3, options: "Less than 6 months\n6-12 months\n1-3 years\n3-5 years\n5-10 years\nOver 10 years" } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s1.id, type: "LONG_TEXT", title: "What improvements would you suggest to make this a better workplace?", required: false, order: 4 } }),
    ];
    // Sample response
    await prisma.generalSurveyResponse.create({
      data: { surveyId: s1.id, userId: respU.id, answers: { create: [
        { questionId: s1q[0].id, value: "4" },
        { questionId: s1q[1].id, value: "Operations" },
        { questionId: s1q[2].id, value: "Yes" },
        { questionId: s1q[3].id, value: "1-3 years" },
        { questionId: s1q[4].id, value: "More cross-department collaboration and regular team-building activities would greatly improve morale." },
      ]}},
    });

    // Survey 2: Workplace Culture (TYPEFORM style)
    const s2 = await prisma.generalSurvey.create({
      data: {
        organizationId: rf.id, title: "Workplace Culture & Inclusion Survey",
        description: "Help us build a more inclusive and supportive workplace. Each question appears one at a time.",
        category: "Workplace Culture", formStyle: "TYPEFORM", status: "PUBLISHED", isPublic: true,
        publicLink: crypto.randomBytes(8).toString("hex"), createdById: adminU.id,
      },
    });
    const s2q = [
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s2.id, type: "YES_NO", title: "Do you feel included in team discussions and decision-making?", required: true, order: 0 } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s2.id, type: "RATING_SCALE", title: "How would you rate the work-life balance?", required: true, order: 1 } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s2.id, type: "CHECKBOX", title: "Which benefits matter most to you?", required: false, order: 2, options: "Health Insurance\nRemote Work Options\nFlexible Working Hours\nProfessional Development\nGym Membership\nChildcare Support" } }),
      await prisma.generalSurveyQuestion.create({ data: { surveyId: s2.id, type: "SHORT_TEXT", title: "Describe our workplace culture in one word", required: false, order: 3 } }),
    ];

    // === ANONYMOUS SURVEY ===
    const anon = await prisma.anonymousSurvey.create({
      data: {
        organizationId: rf.id, title: "Anonymous Leadership Feedback",
        description: "Share your honest thoughts about management and leadership. Your identity is completely protected and cannot be traced.",
        category: "Leadership Feedback", formStyle: "NOTION", status: "PUBLISHED", publicLink: crypto.randomBytes(8).toString("hex"),
      },
    });
    const aq = [
      await prisma.anonymousSurveyQuestion.create({ data: { surveyId: anon.id, type: "RATING_SCALE", title: "How transparent is the management team?", required: true, order: 0 } }),
      await prisma.anonymousSurveyQuestion.create({ data: { surveyId: anon.id, type: "YES_NO", title: "Do you trust senior leadership to make the right decisions?", required: true, order: 1 } }),
      await prisma.anonymousSurveyQuestion.create({ data: { surveyId: anon.id, type: "MULTIPLE_CHOICE", title: "What area needs the most improvement?", required: true, order: 2, options: "Communication\nCompensation & Benefits\nCareer Growth Opportunities\nWorkload Management\nRecognition & Rewards\nCompany Culture" } }),
      await prisma.anonymousSurveyQuestion.create({ data: { surveyId: anon.id, type: "LONG_TEXT", title: "Any other concerns you would like to raise anonymously?", required: false, order: 3 } }),
    ];
    await prisma.anonymousSurveyResponse.create({
      data: { surveyId: anon.id, token: crypto.randomBytes(12).toString("hex"), answers: { create: [
        { questionId: aq[0].id, value: "3" },
        { questionId: aq[1].id, value: "No" },
        { questionId: aq[2].id, value: "Communication" },
        { questionId: aq[3].id, value: "Middle management needs better training on people management and communication skills." },
      ]}},
    });

    // === WHISTLEBLOWING CASES ===
    const c1 = await prisma.case.create({
      data: { caseId: "TC-" + crypto.randomBytes(4).toString("hex").toUpperCase(), organizationId: rf.id,
        title: "Suspected Financial Irregularity in Procurement Department",
        description: "I have noticed discrepancies in procurement invoices dating back several months. Payments appear to be directed to a vendor that may not be legitimate. I have gathered supporting documents but am filing this anonymously for safety.",
        category: "Financial Irregularities", status: "UNDER_REVIEW", priority: "high", isAnonymous: true, reporterToken: crypto.randomBytes(12).toString("hex"),
      },
    });
    await prisma.caseMessage.create({ data: { caseId: c1.id, content: "Thank you for your report. A senior investigator has been assigned and will review the procurement records. We will provide an update within 48 hours.", isFromReporter: false, senderId: adminU.id } });

    const c2 = await prisma.case.create({
      data: { caseId: "TC-" + crypto.randomBytes(4).toString("hex").toUpperCase(), organizationId: rf.id,
        title: "Workplace Harassment - Verbal Abuse Complaint",
        description: "A colleague has been making inappropriate and offensive comments. I have spoken to my direct supervisor but the behavior has continued. I am filing this formal complaint as a last resort.",
        category: "Harassment", status: "SUBMITTED", priority: "critical", isAnonymous: true, reporterToken: crypto.randomBytes(12).toString("hex"),
      },
    });

    const c3 = await prisma.case.create({
      data: { caseId: "TC-" + crypto.randomBytes(4).toString("hex").toUpperCase(), organizationId: rf.id,
        title: "Safety Hazard in Production Area - Resolved",
        description: "A faulty packaging machine was creating a safety risk on the production floor. The issue has been identified and resolved. This case is documented for compliance purposes.",
        category: "Safety Concerns", status: "RESOLVED", priority: "normal", isAnonymous: false, reporterName: "Alice Johnson",
      },
    });

    // === AUDIT LOGS ===
    await prisma.auditLog.create({ data: { organizationId: rf.id, userId: adminU.id, action: "DEMO_SEED", entityType: "System", metadata: JSON.stringify({ message: "Demo data seeded successfully" }) } });

    return new Response(
      `<!DOCTYPE html>
<html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;margin:0">
<div style="max-width:600px;width:100%;text-align:center;padding:2.5rem;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="width:56px;height:56px;border-radius:16px;background:#5B21B6;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
    <span style="color:white;font-size:24px;font-weight:800">TC</span>
  </div>
  <h1 style="font-size:24px;font-weight:700;margin:0 0 4px">Database Reset Complete</h1>
  <p style="color:#64748b;font-size:14px;margin:0 0 24px">All existing data has been cleared and fresh demo data seeded</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px">
  <div style="text-align:left;font-size:14px;line-height:2">
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px">
      <p style="font-weight:600;margin:0 0 8px;color:#5B21B6">TRUCORE Ltd. (Platform Admin)</p>
      <p style="margin:0;font-family:monospace;font-size:13px;background:#1e293b;color:#e2e8f0;padding:8px 12px;border-radius:6px">superadmin@trucore.com / Inspire@2026</p>
    </div>
    <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:16px;border:1px solid #bbf7d0">
      <p style="font-weight:600;margin:0 0 8px;color:#059669">Rite Foods (Demo Organization)</p>
      <p style="margin:4px 0;font-family:monospace;font-size:13px;background:#1e293b;color:#e2e8f0;padding:8px 12px;border-radius:6px">admin@ritefoods.com / Inspire@2026 <span style="color:#94a3b8;font-size:11px">(Org Admin)</span></p>
      <p style="margin:4px 0;font-family:monospace;font-size:13px;background:#1e293b;color:#e2e8f0;padding:8px 12px;border-radius:6px">viewer@ritefoods.com / Inspire@2026 <span style="color:#94a3b8;font-size:11px">(Viewer)</span></p>
      <p style="margin:4px 0;font-family:monospace;font-size:13px;background:#1e293b;color:#e2e8f0;padding:8px 12px;border-radius:6px">respondent@ritefoods.com / Inspire@2026 <span style="color:#94a3b8;font-size:11px">(Respondent)</span></p>
    </div>
  </div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
  <p style="font-size:13px;color:#64748b;margin:0 0 16px">
    Seeded: 2 general surveys, 1 anonymous survey, 3 whistleblowing cases, audit logs
  </p>
  <a href="/login" style="display:inline-block;padding:12px 32px;background:#5B21B6;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Sign In to TRUCORE</a>
</div></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    return new Response(`<html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center;padding:2rem"><h1 style="color:#dc2626">Seed Failed</h1><pre style="font-size:12px;color:#64748b">${error.message}</pre></div></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } });
  }
}
