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
    // Clean ALL data
    const tables = [
      "caseMessage", "caseAttachment", "case",
      "generalSurveyAnswer", "generalSurveyResponse", "generalSurveyQuestion", "generalSurvey",
      "anonymousSurveyAnswer", "anonymousSurveyResponse", "anonymousSurveyQuestion", "anonymousSurvey",
      "auditLog", "notification",
      "organizationModule", "brandingConfig",
      "membership", "session", "account",
      "organization", "user",
    ];
    for (const t of tables) {
      try { await (prisma as any)[t].deleteMany(); } catch {}
    }
    console.log("All data cleaned");

    const { roles, modules } = await ensureRoles();
    const sar = roles.find((r: any) => r.type === "SUPER_ADMIN")!;
    const oar = roles.find((r: any) => r.type === "ORG_ADMIN")!;
    const mar = roles.find((r: any) => r.type === "MODULE_ADMIN")!;
    const vr = roles.find((r: any) => r.type === "VIEWER")!;

    const pw = await bcrypt.hash("Inspire@2026", 12);

    // === TRUCORE LTD (Platform Org) ===
    const trucoreOrg = await prisma.organization.create({
      data: { name: "TRUCORE Ltd.", slug: "trucore-ltd", publicReportSlug: "trucore" },
    });
    await prisma.brandingConfig.create({
      data: { organizationId: trucoreOrg.id, companyName: "TRUCORE Ltd.", primaryColor: "#5B21B6", secondaryColor: "#7C3AED", accentColor: "#C4B5FD" },
    });
    for (const m of modules) await prisma.organizationModule.create({ data: { organizationId: trucoreOrg.id, moduleId: m.id, isEnabled: true } });

    // Super Admin (Platform Owner)
    await prisma.user.create({
      data: { name: "Platform Super Admin", email: "trucore@itadvisoryprojects.com.ng", password: pw, isActive: true },
    });
    await prisma.membership.create({ data: { userId: (await prisma.user.findUnique({ where: { email: "trucore@itadvisoryprojects.com.ng" } }))!.id, organizationId: trucoreOrg.id, roleId: sar.id } });

    return new Response(
      `<!DOCTYPE html>
<html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;margin:0">
<div style="max-width:500px;width:100%;text-align:center;padding:2.5rem;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="width:56px;height:56px;border-radius:16px;background:#5B21B6;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
    <span style="color:white;font-size:24px;font-weight:800">TC</span>
  </div>
  <h1 style="font-size:24px;font-weight:700;margin:0 0 4px">Database Reset Complete</h1>
  <p style="color:#64748b;font-size:14px;margin:0 0 24px">All data cleared. Platform ready for fresh setup.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px">
  <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-weight:600;margin:0 0 8px;color:#5B21B6">Platform Super Admin</p>
    <p style="margin:0;font-family:monospace;font-size:14px;background:#1e293b;color:#e2e8f0;padding:10px 14px;border-radius:6px;letter-spacing:0.5px">
      trucore@itadvisoryprojects.com.ng <span style="color:#94a3b8;font-size:12px">/</span> Inspire@2026
    </p>
  </div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
  <p style="font-size:13px;color:#64748b;margin:0 0 16px">
    Use this account to create organizations, manage users, configure modules, and monitor the platform.
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
