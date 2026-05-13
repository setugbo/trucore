import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const existingRoles = await prisma.role.findFirst();
    if (existingRoles) {
      return new Response(`<html><body style="font-family:Inter;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc">
        <div style="text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
          <h1 style="color:#5B21B6">System Ready</h1><p>Roles already configured. <a href="/login" style="color:#5B21B6">Sign in</a></p>
        </div></body></html>`,
        { headers: { "Content-Type": "text/html" } });
    }

    await prisma.role.createMany({
      data: [
        { name: "System Admin", type: "SYSTEM_ADMIN", description: "Full system access" },
        { name: "Module Admin", type: "MODULE_ADMIN", description: "Can manage specific modules" },
        { name: "Viewer", type: "VIEWER", description: "Read-only access" },
      ],
    });

    const roles = await prisma.role.count();

    return new Response(`<html><body style="font-family:Inter;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc">
      <div style="text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
        <h1 style="color:#5B21B6">System Initialized</h1><p>Created ${roles} roles.</p></div></body></html>`,
      { headers: { "Content-Type": "text/html" } });
  } catch (error) {
    return new Response(`<html><body><h1 style="color:red">Failed</h1><pre>${error}</pre></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } });
  }
}

export async function POST() {
  try {
    const existingRoles = await prisma.role.findFirst();
    if (existingRoles) return NextResponse.json({ message: "System already initialized" });

    await prisma.role.createMany({
      data: [
        { name: "System Admin", type: "SYSTEM_ADMIN", description: "Full system access" },
        { name: "Module Admin", type: "MODULE_ADMIN", description: "Can manage specific modules" },
        { name: "Viewer", type: "VIEWER", description: "Read-only access" },
      ],
    });

    const roles = await prisma.role.count();
    return NextResponse.json({ message: "System initialized", roles });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Initialization failed" }, { status: 500 });
  }
}
