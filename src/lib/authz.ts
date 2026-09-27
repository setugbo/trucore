import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { RoleType } from "@/types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type Actor = {
  userId: string;
  organizationId: string;
  roleType: RoleType;
  isPlatformAdmin: boolean;
};

export type ModulePermission = "canView" | "canCreate" | "canEdit" | "canDelete";

/** Loads the caller's membership + platform-admin flag. Returns null if unauthenticated or has no org membership. */
export async function getActor(): Promise<Actor | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return null;

  const [membership, user] = await Promise.all([
    prisma.membership.findUnique({ where: { userId }, include: { role: true, organization: { select: { isActive: true } } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { isActive: true, isPlatformAdmin: true } }),
  ]);
  if (!membership || !user?.isActive) return null;
  // A JWT session can outlive an org being deactivated between logins - re-check on every request.
  if (!membership.organization.isActive && !user.isPlatformAdmin) return null;

  return {
    userId,
    organizationId: membership.organizationId,
    roleType: membership.role.type,
    isPlatformAdmin: !!user.isPlatformAdmin,
  };
}

/** Same as getActor(), but throws a 401 ApiError instead of returning null. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new ApiError(401, "Unauthorized");
  return actor;
}

/** Throws a 403 unless the actor belongs to targetOrgId or is a platform admin. */
export function assertOrgAccess(actor: Actor, targetOrgId: string) {
  if (actor.isPlatformAdmin) return;
  if (actor.organizationId !== targetOrgId) throw new ApiError(403, "Forbidden");
}

/** Throws a 403 unless the actor may act on the given module/permission within targetOrgId. */
export async function assertModulePermission(
  actor: Actor,
  targetOrgId: string,
  moduleType: string,
  permission: ModulePermission
) {
  assertOrgAccess(actor, targetOrgId);
  if (actor.isPlatformAdmin) return;
  if (actor.roleType === "SYSTEM_ADMIN") return;

  const perm = await prisma.userModulePermission.findFirst({
    where: { userId: actor.userId, organizationId: targetOrgId, module: { type: moduleType } },
  });
  if (!perm || !perm[permission]) throw new ApiError(403, "Forbidden");
}

/** Throws a 403 unless the actor is a platform admin. */
export function assertPlatformAdmin(actor: Actor) {
  if (!actor.isPlatformAdmin) throw new ApiError(403, "Forbidden");
}

/** Wraps a route handler, turning thrown ApiError/other errors into consistent JSON responses. */
export function withErrorHandling<Args extends any[]>(
  handler: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error("Unhandled API error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
