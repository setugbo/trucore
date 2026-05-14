import prisma from "@/lib/prisma";

export async function checkModulePermission(userId: string, orgId: string, moduleType: string, permission: "canView" | "canCreate" | "canEdit" | "canDelete") {
  const membership = await prisma.membership.findUnique({
    where: { userId },
    include: { role: true },
  });
  if (!membership || membership.organizationId !== orgId) return false;
  if (membership.role.type === "SYSTEM_ADMIN") return true;

  const perm = await prisma.userModulePermission.findFirst({
    where: { userId, organizationId: orgId, module: { type: moduleType } },
  });
  return perm ? perm[permission] : false;
}
