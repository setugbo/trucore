import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor, ApiError, withErrorHandling } from "@/lib/authz";

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  // Always scoped to the caller's own notifications - organizationId here is
  // just an extra filter, never a way to view someone else's org.
  const where: any = { userId: actor.userId };
  if (organizationId) where.organizationId = organizationId;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { ...where, isRead: false },
  });

  return NextResponse.json({ notifications, unreadCount });
});

export const PUT = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  const { notificationId, markAll } = await request.json();

  if (markAll) {
    await prisma.notification.updateMany({
      where: { userId: actor.userId, isRead: false },
      data: { isRead: true },
    });
  } else if (notificationId) {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== actor.userId) {
      throw new ApiError(404, "Not found");
    }
    await prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  }

  return NextResponse.json({ success: true });
});
