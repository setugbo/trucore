import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const membership = (session.user as any).membership;
    if (!membership) return NextResponse.json({ permissions: [], role: "" });

    const isSystemAdmin = membership.role?.type === "SYSTEM_ADMIN";

    // Get all modules from DB (or fallback to static list)
    let modules = await prisma.module.findMany();
    if (modules.length === 0) {
      modules = [
        { id: "gen", type: "GENERAL_SURVEY", name: "General Surveys", description: "", createdAt: new Date(), updatedAt: new Date() },
        { id: "anon", type: "ANONYMOUS_SURVEY", name: "Anonymous Surveys", description: "", createdAt: new Date(), updatedAt: new Date() },
        { id: "whistle", type: "WHISTLEBLOWING", name: "Whistleblowing", description: "", createdAt: new Date(), updatedAt: new Date() },
      ];
    }

    let permissions;
    if (isSystemAdmin) {
      permissions = modules.map((m) => ({
        moduleType: m.type,
        moduleName: m.name,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      }));
    } else {
      const dbPerms = await prisma.userModulePermission.findMany({
        where: { userId, organizationId: membership.organizationId },
        include: { module: true },
      });
      // Build full permission list - include modules without explicit permissions (default to false)
      permissions = modules.map((m) => {
        const found = dbPerms.find((p) => p.module.type === m.type);
        return {
          moduleType: m.type,
          moduleName: m.name,
          canView: found?.canView || false,
          canCreate: found?.canCreate || false,
          canEdit: found?.canEdit || false,
          canDelete: found?.canDelete || false,
        };
      });
    }

    return NextResponse.json({ permissions, role: membership.role?.type });
  } catch (error) {
    console.error("Permissions fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
