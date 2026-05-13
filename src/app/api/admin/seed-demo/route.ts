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
    const sar = roles.find((r: any) => r.type === "SYSTEM_ADMIN")!;

    const pw = await bcrypt.hash("Inspire@2026", 12);

    const org = await prisma.organization.create({ data: { name: "TRUCORE", slug: "trucore", publicReportSlug: "report" } });
    await prisma.brandingConfig.create({ data: { organizationId: org.id, companyName: "TRUCORE" } });
    const user = await prisma.user.create({ data: { name: "System Administrator", email: "trucore@itadvisoryprojects.com.ng", password: pw, isActive: true } });
    await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, roleId: sar.id } });

    return new Response(
      `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;margin:0">
<div style="max-width:480px;text-align:center;padding:2.5rem;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="width:56px;height:56px;border-radius:16px;background:#5B21B6;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
    <span style="color:white;font-size:24px;font-weight:800">TC</span>
  </div>
  <h1 style="font-size:24px;font-weight:700;margin:0 0 4px">Database Reset Complete</h1>
  <p style="color:#64748b;font-size:14px;margin:0 0 20px">Single-organization mode ready</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px">
  <div style="background:#f8fafc;border-radius:8px;padding:16px">
    <p style="font-weight:600;margin:0 0 8px;color:#5B21B6">System Administrator</p>
    <p style="margin:0;font-family:monospace;font-size:14px;background:#1e293b;color:#e2e8f0;padding:10px 14px;border-radius:6px">
      trucore@itadvisoryprojects.com.ng / Inspire@2026
    </p>
  </div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
  <p style="font-size:13px;color:#64748b;margin:0 0 16px">3 roles: System Admin, Module Admin, Viewer</p>
  <a href="/login" style="display:inline-block;padding:12px 32px;background:#5B21B6;color:white;border-radius:8px;text-decoration:none;font-weight:600">Sign In</a>
</div></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    return new Response(`<html><body><h1 style="color:#dc2626">Seed Failed</h1><pre>${error.message}</pre></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } });
  }
}
