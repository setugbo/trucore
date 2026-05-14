import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - Get all permissions for admin view
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = (session.user as any)?.membership;
    if (membership?.role?.type !== "SYSTEM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const perms = await prisma.userModulePermission.findMany({
      where: { organizationId: membership.organizationId },
      include: { module: true, user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(perms.map((p) => ({
      id: p.id, userId: p.userId, userName: p.user.name, userEmail: p.user.email,
      moduleType: p.module.type, moduleName: p.module.name,
      canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete,
    })));
  } catch (error) {
    console.error("Permissions fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Create or update a permission
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = (session.user as any)?.membership;
    if (membership?.role?.type !== "SYSTEM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { userId, moduleType, canView, canCreate, canEdit, canDelete } = body;
    if (!userId || !moduleType) return NextResponse.json({ error: "userId and moduleType are required" }, { status: 400 });

    const orgId = membership.organizationId;
    const mod = await prisma.module.findUnique({ where: { type: moduleType } });
    if (!mod) return NextResponse.json({ error: "Module not found in database. Run seed-demo first." }, { status: 400 });

    const perm = await prisma.userModulePermission.upsert({
      where: { userId_organizationId_moduleId: { userId, organizationId: orgId, moduleId: mod.id } },
      update: {
        ...(canView !== undefined && { canView }),
        ...(canCreate !== undefined && { canCreate }),
        ...(canEdit !== undefined && { canEdit }),
        ...(canDelete !== undefined && { canDelete }),
      },
      create: {
        userId, organizationId: orgId, moduleId: mod.id,
        canView: canView || false, canCreate: canCreate || false, canEdit: canEdit || false, canDelete: canDelete || false,
      },
    });

    return NextResponse.json(perm);
  } catch (error) {
    console.error("Permission update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
