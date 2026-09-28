import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor, ApiError, withErrorHandling } from "@/lib/authz";
import { checkRateLimit, getClientIp, rateLimited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`access-request:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!allowed) return rateLimited();

    const { name, email, organizationName, reason } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists. Please contact your organization admin." }, { status: 400 });
    }

    // Access requests are a platform-level concern (someone wants an org
    // set up / added to the platform), so only TRUCORE's own platform
    // admins should be notified - never every customer org's own admin.
    const platformAdmins = await prisma.user.findMany({
      where: { isPlatformAdmin: true },
      include: { membership: true },
    });

    for (const admin of platformAdmins) {
      if (!admin.membership) continue;
      await prisma.notification.create({
        data: {
          organizationId: admin.membership.organizationId,
          userId: admin.id,
          type: "ACCESS_REQUEST",
          title: "New Access Request",
          message: `${name} (${email}) has requested access.${organizationName ? ` Organization: ${organizationName}` : ""}${reason ? ` Reason: ${reason}` : ""}`,
          link: "/dashboard/platform",
        },
      });
    }

    return NextResponse.json({
      message: "Your request has been submitted. An administrator will review and contact you.",
    }, { status: 201 });
  } catch (error) {
    console.error("Access request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withErrorHandling(async () => {
  const actor = await requireActor();
  if (!actor.isPlatformAdmin) throw new ApiError(403, "Forbidden");

  const requests = await prisma.notification.findMany({
    where: { type: "ACCESS_REQUEST" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(requests);
});
