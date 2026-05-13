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
    const { roles, modules } = await ensureRoles();
    const superAdminRole = roles.find((r: any) => r.type === "SUPER_ADMIN");
    const orgAdminRole = roles.find((r: any) => r.type === "ORG_ADMIN");
    const viewerRole = roles.find((r: any) => r.type === "VIEWER");
    const respondentRole = roles.find((r: any) => r.type === "RESPONDENT");
    if (!superAdminRole || !orgAdminRole) throw new Error("Roles not found");

    const pw = await bcrypt.hash("Inspire@2026", 12);

    // === TRUCORE LTD ===
    let trucoreOrg = await prisma.organization.findUnique({ where: { slug: "trucore-ltd" } });
    if (!trucoreOrg) {
      trucoreOrg = await prisma.organization.create({ data: { name: "TRUCORE Ltd.", slug: "trucore-ltd" } });
      await prisma.brandingConfig.create({ data: { organizationId: trucoreOrg.id, companyName: "TRUCORE Ltd." } });
      for (const m of modules) await prisma.organizationModule.create({ data: { organizationId: trucoreOrg.id, moduleId: m.id, isEnabled: true } });
    }

    let sa = await prisma.user.findUnique({ where: { email: "superadmin@trucore.com" } });
    if (!sa) {
      sa = await prisma.user.create({ data: { name: "Super Admin", email: "superadmin@trucore.com", password: pw, isActive: true } });
      await prisma.membership.create({ data: { userId: sa.id, organizationId: trucoreOrg.id, roleId: superAdminRole.id } });
    }

    // === RITE FOODS ===
    let rf = await prisma.organization.findUnique({ where: { slug: "rite-foods" } });
    if (!rf) {
      rf = await prisma.organization.create({ data: { name: "Rite Foods", slug: "rite-foods" } });
      await prisma.brandingConfig.create({ data: { organizationId: rf.id, companyName: "Rite Foods", primaryColor: "#059669", secondaryColor: "#10B981", accentColor: "#A7F3D0" } });
      for (const m of modules) await prisma.organizationModule.create({ data: { organizationId: rf.id, moduleId: m.id, isEnabled: true } });
    }

    let adminU = await prisma.user.findUnique({ where: { email: "admin@ritefoods.com" } });
    if (!adminU) {
      adminU = await prisma.user.create({ data: { name: "Jane Doe", email: "admin@ritefoods.com", password: pw, isActive: true } });
      await prisma.membership.create({ data: { userId: adminU.id, organizationId: rf.id, roleId: orgAdminRole.id } });
    }

    let viewerU = await prisma.user.findUnique({ where: { email: "viewer@ritefoods.com" } });
    if (!viewerU) {
      viewerU = await prisma.user.create({ data: { name: "John Smith", email: "viewer@ritefoods.com", password: pw, isActive: true } });
      await prisma.membership.create({ data: { userId: viewerU.id, organizationId: rf.id, roleId: viewerRole.id } });
    }

    let respU = await prisma.user.findUnique({ where: { email: "respondent@ritefoods.com" } });
    if (!respU) {
      respU = await prisma.user.create({ data: { name: "Alice Johnson", email: "respondent@ritefoods.com", password: pw, isActive: true } });
      await prisma.membership.create({ data: { userId: respU.id, organizationId: rf.id, roleId: respondentRole.id } });
    }

    // === GENERAL SURVEYS ===
    const surveyCount = await prisma.generalSurvey.count({ where: { organizationId: rf.id } });
    if (surveyCount === 0 && adminU) {
      const survey = await prisma.generalSurvey.create({
        data: {
          organizationId: rf.id, title: "Employee Engagement Survey Q2 2026",
          description: "Help us understand how you feel working at Rite Foods.",
          category: "Employee Engagement", formStyle: "NOTION", status: "PUBLISHED", isPublic: true, createdById: adminU.id,
        },
      });
      const q1 = await prisma.generalSurveyQuestion.create({ data: { surveyId: survey.id, type: "RATING_SCALE", title: "How satisfied are you with your role?", required: true, order: 0 } });
      const q2 = await prisma.generalSurveyQuestion.create({ data: { surveyId: survey.id, type: "MULTIPLE_CHOICE", title: "What department do you work in?", required: true, order: 1, options: "Operations\nFinance\nHR\nMarketing\nSales\nIT\nManagement" } });
      const q3 = await prisma.generalSurveyQuestion.create({ data: { surveyId: survey.id, type: "YES_NO", title: "Do you feel valued at work?", required: true, order: 2 } });
      const q4 = await prisma.generalSurveyQuestion.create({ data: { surveyId: survey.id, type: "LONG_TEXT", title: "What improvements would you suggest?", required: false, order: 3 } });
      const q5 = await prisma.generalSurveyQuestion.create({ data: { surveyId: survey.id, type: "DROPDOWN", title: "How long have you been with the company?", required: true, order: 4, options: "Less than 1 year\n1-3 years\n3-5 years\n5-10 years\nOver 10 years" } });

      // Create culture survey
      await prisma.generalSurvey.create({ data: { organizationId: rf.id, title: "Workplace Culture Assessment", category: "Workplace Culture", formStyle: "TYPEFORM", status: "PUBLISHED", isPublic: true, createdById: adminU.id } });

      if (respU) {
        await prisma.generalSurveyResponse.create({
          data: { surveyId: survey.id, userId: respU.id, answers: { create: [
            { questionId: q1.id, value: "4" }, { questionId: q2.id, value: "Operations" }, { questionId: q3.id, value: "Yes" }, { questionId: q4.id, value: "More team building activities!" }, { questionId: q5.id, value: "1-3 years" },
          ]}},
        });
      }
    }

    // === ANONYMOUS SURVEY ===
    const anonCount = await prisma.anonymousSurvey.count({ where: { organizationId: rf.id } });
    if (anonCount === 0) {
      const as = await prisma.anonymousSurvey.create({
        data: { organizationId: rf.id, title: "Anonymous Feedback - Management", description: "Share your honest thoughts. Completely anonymous.", category: "Leadership Feedback", formStyle: "NOTION", status: "PUBLISHED" },
      });
      const aq1 = await prisma.anonymousSurveyQuestion.create({ data: { surveyId: as.id, type: "RATING_SCALE", title: "How transparent is management?", required: true, order: 0 } });
      const aq2 = await prisma.anonymousSurveyQuestion.create({ data: { surveyId: as.id, type: "YES_NO", title: "Do you trust senior leadership?", required: true, order: 1 } });
      const aq3 = await prisma.anonymousSurveyQuestion.create({ data: { surveyId: as.id, type: "LONG_TEXT", title: "Any concerns to raise?", required: false, order: 2 } });
      const aq4 = await prisma.anonymousSurveyQuestion.create({ data: { surveyId: as.id, type: "MULTIPLE_CHOICE", title: "What area needs most improvement?", required: true, order: 3, options: "Communication\nCompensation\nCareer Growth\nWorkload\nRecognition" } });
      await prisma.anonymousSurveyResponse.create({
        data: { surveyId: as.id, token: "demo-" + require("crypto").randomBytes(8).toString("hex"), answers: { create: [
          { questionId: aq1.id, value: "3" }, { questionId: aq2.id, value: "No" }, { questionId: aq3.id, value: "Middle management needs better training." }, { questionId: aq4.id, value: "Communication" },
        ]}},
      });
    }

    // === WHISTLEBLOWING CASES ===
    const caseCount = await prisma.case.count({ where: { organizationId: rf.id } });
    if (caseCount === 0) {
      await prisma.case.create({ data: { caseId: "TC-DEMO-A1B2", organizationId: rf.id, title: "Suspected Financial Irregularity in Procurement", description: "Discrepancies in procurement invoices dating back several months.", category: "Financial Irregularities", status: "UNDER_REVIEW", priority: "high", isAnonymous: true } });
      await prisma.case.create({ data: { caseId: "TC-DEMO-C3D4", organizationId: rf.id, title: "Workplace Harassment Concern", description: "Inappropriate comments from a colleague despite reporting to supervisor.", category: "Harassment", status: "SUBMITTED", priority: "critical", isAnonymous: true } });
      await prisma.case.create({ data: { caseId: "TC-DEMO-E5F6", organizationId: rf.id, title: "Safety Hazard - Resolved", description: "Faulty machine in production area. Issue resolved.", status: "RESOLVED", priority: "normal", isAnonymous: false, reporterName: "Alice Johnson" } });
    }

    return new Response(
      `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc">
      <div style="max-width:600px;text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
        <h1 style="color:#5B21B6;font-size:24px;margin-bottom:8px">Demo Data Seeded Successfully</h1>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
        <div style="text-align:left;font-size:14px;line-height:1.8">
          <p><strong>TRUCORE Ltd.</strong> — Super Admin</p>
          <p style="font-family:monospace;background:#f1f5f9;padding:8px;border-radius:6px">superadmin@trucore.com / Inspire@2026</p>
          <p><strong>Rite Foods</strong> — Org Admin</p>
          <p style="font-family:monospace;background:#f1f5f9;padding:8px;border-radius:6px">admin@ritefoods.com / Inspire@2026</p>
          <p><strong>Rite Foods</strong> — Viewer</p>
          <p style="font-family:monospace;background:#f1f5f9;padding:8px;border-radius:6px">viewer@ritefoods.com / Inspire@2026</p>
          <p><strong>Rite Foods</strong> — Respondent</p>
          <p style="font-family:monospace;background:#f1f5f9;padding:8px;border-radius:6px">respondent@ritefoods.com / Inspire@2026</p>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
        <p style="font-size:13px;color:#64748b">2 general surveys, 1 anonymous survey, 3 whistleblowing cases created</p>
        <a href="/login" style="display:inline-block;margin-top:12px;padding:10px 24px;background:#5B21B6;color:white;border-radius:8px;text-decoration:none;font-weight:600">Sign In</a>
      </div></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    return new Response(`<html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div><h1 style="color:#dc2626">Error</h1><pre style="font-size:12px;color:#64748b">${error.message}</pre></div></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } });
  }
}
