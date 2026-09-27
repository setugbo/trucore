import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor, ApiError, withErrorHandling } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET - Get all permissions for the caller's own org
export const GET = withErrorHandling(async () => {
  const actor = await requireActor();
  if (actor.roleType !== "SYSTEM_ADMIN" && !actor.isPlatformAdmin) throw new ApiError(403, "Forbidden");

  const perms = await prisma.userModulePermission.findMany({
    where: { organizationId: actor.organizationId },
    include: { module: true, user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(perms.map((p) => ({
    id: p.id, userId: p.userId, userName: p.user.name, userEmail: p.user.email,
    moduleType: p.module.type, moduleName: p.module.name,
    canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete,
  })));
});

// PUT - Create or update a permission (scoped to the caller's own org)
export const PUT = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  if (actor.roleType !== "SYSTEM_ADMIN" && !actor.isPlatformAdmin) throw new ApiError(403, "Forbidden");

  const body = await request.json();
  const { userId, moduleType, canView, canCreate, canEdit, canDelete } = body;
  if (!userId || !moduleType) return NextResponse.json({ error: "userId and moduleType are required" }, { status: 400 });

  // The target user must belong to the caller's own org.
  const targetMembership = await prisma.membership.findUnique({ where: { userId } });
  if (!targetMembership || targetMembership.organizationId !== actor.organizationId) {
    return NextResponse.json({ error: "User not found in this organization" }, { status: 404 });
  }

  const orgId = actor.organizationId;
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
});
