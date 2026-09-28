import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/authz";

export const dynamic = "force-dynamic";

async function ensureRoles() {
  let roles = await prisma.role.findMany();
  if (roles.length === 0) {
    await prisma.role.createMany({
      data: [
        { name: "System Admin", type: "SYSTEM_ADMIN", description: "Full access within an organization" },
        { name: "Module Admin", type: "MODULE_ADMIN", description: "Can manage specific modules" },
        { name: "Viewer", type: "VIEWER", description: "Read-only access" },
      ],
    });
    roles = await prisma.role.findMany();
  }
  return roles;
}

function refusalPage(message: string) {
  return new Response(
    `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;margin:0">
<div style="max-width:480px;text-align:center;padding:2.5rem;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#dc2626">Not available</h1>
  <p style="color:#64748b;font-size:14px">${message}</p>
</div></body></html>`,
    { status: 403, headers: { "Content-Type": "text/html" } }
  );
}

export async function GET(request: Request) {
  try {
    // This route WIPES all application data and reseeds a fixed demo dataset.
    // It must never be reachable in a real deployment by default - the operator
    // has to deliberately opt in via env var (e.g. only on a disposable demo/
    // staging environment), which also sidesteps the chicken-and-egg problem
    // of requiring a logged-in admin before any account exists yet.
    if (process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
      return refusalPage("Destructive demo seeding is disabled. Set ALLOW_DESTRUCTIVE_SEED=true in this environment's variables to enable it.");
    }
    // If real users already exist, only a platform admin may trigger a wipe.
    const existingUserCount = await prisma.user.count();
    if (existingUserCount > 0) {
      const actor = await getActor();
      if (!actor?.isPlatformAdmin) {
        return refusalPage("This environment already has data. Sign in as a platform admin to reseed it.");
      }
    }

    const seedPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!seedPassword) {
      return refusalPage("SEED_ADMIN_PASSWORD is not set. Set it in this environment's variables before seeding.");
    }

    const tables = ["caseMessage", "caseAttachment", "case", "generalSurveyAnswer", "generalSurveyResponse", "generalSurveyQuestion", "generalSurvey", "anonymousSurveyAnswer", "anonymousSurveyResponse", "anonymousSurveyQuestion", "anonymousSurvey", "auditLog", "notification", "brandingConfig", "membership", "userModulePermission", "module", "session", "account", "organization", "user"];
    for (const t of tables) { try { await (prisma as any)[t].deleteMany(); } catch {} }
    try { await prisma.role.deleteMany(); } catch {}

    const roles = await ensureRoles();
    const saRole = roles.find((r: any) => r.type === "SYSTEM_ADMIN")!;
    const pw = await bcrypt.hash(seedPassword, 12);

    const moduleTypes = ["GENERAL_SURVEY", "ANONYMOUS_SURVEY", "WHISTLEBLOWING"];
    const moduleNames = ["General Surveys", "Anonymous Surveys", "Whistleblowing"];
    const moduleDescs = ["Standard internal surveys", "Anonymous feedback collection", "Confidential whistleblowing reports"];
    for (let i = 0; i < 3; i++) {
      try { await prisma.module.create({ data: { type: moduleTypes[i], name: moduleNames[i], description: moduleDescs[i] } }); } catch {}
    }

    const org = await prisma.organization.create({ data: { name: "TRUCORE", slug: "trucore", publicReportSlug: "report" } });
    await prisma.brandingConfig.create({ data: { organizationId: org.id, companyName: "TRUCORE" } });
    const user = await prisma.user.create({ data: { name: "Platform Administrator", email: "admin@trucore.local", password: pw, isActive: true, isPlatformAdmin: true } });
    await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, roleId: saRole.id } });

    return new Response(
      `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;margin:0">
<div style="max-width:480px;text-align:center;padding:2.5rem;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="width:56px;height:56px;border-radius:16px;background:#5B21B6;display:flex;align-items:center;justify-content:center;margin:0 auto 16px"><span style="color:white;font-size:24px;font-weight:800">TC</span></div>
  <h1 style="font-size:24px;font-weight:700;margin:0 0 4px">Database Reset Complete</h1>
  <p style="color:#64748b;font-size:14px;margin:0 0 20px">All data wiped. Only the platform administrator account remains.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px">
  <div style="background:#f8fafc;border-radius:8px;padding:16px">
    <p style="font-weight:600;margin:0 0 8px;color:#5B21B6">Platform Administrator</p>
    <p style="margin:0;font-family:monospace;font-size:14px;background:#1e293b;color:#e2e8f0;padding:10px 14px;border-radius:6px">admin@trucore.local</p>
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Password is the SEED_ADMIN_PASSWORD you configured for this environment.</p>
  </div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
  <a href="/login" style="display:inline-block;padding:12px 32px;background:#5B21B6;color:white;border-radius:8px;text-decoration:none;font-weight:600">Sign In to TRUCORE</a>
</div></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    return new Response(`<html><body><h1 style="color:#dc2626">Seed Failed</h1><pre>${String(error?.message || error)}</pre></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } });
  }
}
