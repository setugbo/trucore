import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RoleType, ModuleType } from "@/generated/prisma/client";

export const dynamic = 'force-dynamic';

async function initializeSystem() {
  const existingRoles = await prisma.role.findFirst();
  if (existingRoles) {
    return { message: "System already initialized", roles: 0, modules: 0 };
  }

  const roles = await prisma.$transaction(async (tx) => {
    return await Promise.all([
      tx.role.create({ data: { name: "Super Admin", type: "SUPER_ADMIN", description: "Full system access across all organizations" } }),
      tx.role.create({ data: { name: "Organization Admin", type: "ORG_ADMIN", description: "Full access within their organization" } }),
      tx.role.create({ data: { name: "Module Admin", type: "MODULE_ADMIN", description: "Can manage specific modules" } }),
      tx.role.create({ data: { name: "Contributor", type: "CONTRIBUTOR", description: "Can create and edit content" } }),
      tx.role.create({ data: { name: "Viewer", type: "VIEWER", description: "Read-only access" } }),
      tx.role.create({ data: { name: "Respondent", type: "RESPONDENT", description: "Can only respond to surveys" } }),
    ]);
  });

  const modules = await prisma.$transaction(async (tx) => {
    return await Promise.all([
      tx.module.create({ data: { type: "GENERAL_SURVEY", name: "General Surveys", description: "Standard internal surveys with identifiable users" } }),
      tx.module.create({ data: { type: "ANONYMOUS_SURVEY", name: "Anonymous Surveys", description: "Completely anonymous feedback collection" } }),
      tx.module.create({ data: { type: "WHISTLEBLOWING", name: "Whistleblowing", description: "Secure confidential reporting system" } }),
    ]);
  });

  for (const role of roles) {
    const canAll = ["SUPER_ADMIN", "ORG_ADMIN", "MODULE_ADMIN"].includes(role.type);
    const canWrite = canAll || role.type === "CONTRIBUTOR";
    const canView = canAll || canWrite || role.type === "VIEWER";
    for (const mod of modules) {
      await prisma.permission.create({
        data: { roleId: role.id, moduleId: mod.id, canView, canCreate: canWrite, canEdit: canWrite, canDelete: canAll },
      });
    }
  }

  return { message: "System initialized successfully", roles: roles.length, modules: modules.length };
}

export async function GET() {
  try {
    const result = await initializeSystem();
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc">
      <div style="text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
        <h1 style="color:#5B21B6">${result.message}</h1>
        ${result.roles ? `<p>Created ${result.roles} roles and ${result.modules} modules.</p><p>You can now <a href="/register" style="color:#5B21B6">register</a> your first user.</p>` : '<p>Already configured. <a href="/login" style="color:#5B21B6">Sign in</a></p>'}
      </div></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    return new Response(`<html><body><h1>Initialization failed</h1><pre>${error}</pre></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } });
  }
}

export async function POST() {
  try {
    const result = await initializeSystem();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Initialization failed" }, { status: 500 });
  }
}
