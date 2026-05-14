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
    if (!membership) return NextResponse.json({ permissions: [] });

    const isSystemAdmin = membership.role?.type === "SYSTEM_ADMIN";

    let permissions;
    if (isSystemAdmin) {
      const modules = await prisma.module.findMany();
      permissions = modules.map((m) => ({
        moduleType: m.type,
        moduleName: m.name,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      }));
    } else {
      permissions = await prisma.userModulePermission.findMany({
        where: { userId, organizationId: membership.organizationId },
        include: { module: true },
      });
      permissions = permissions.map((p) => ({
        moduleType: p.module.type,
        moduleName: p.module.name,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
      }));
    }

    return NextResponse.json({ permissions, role: membership.role?.type });
  } catch (error) {
    console.error("Permissions fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
