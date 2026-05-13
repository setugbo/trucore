import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { name, email, organizationName, reason } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Check if already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists. Please contact your organization admin." }, { status: 400 });
    }

    // Create a notification for super admins
    const superAdmins = await prisma.user.findMany({
      where: { membership: { role: { type: "SYSTEM_ADMIN" } } },
    });

    for (const admin of superAdmins) {
      await prisma.notification.create({
        data: {
          organizationId: (await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }))?.id || "",
          userId: admin.id,
          type: "ACCESS_REQUEST",
          title: "New Access Request",
          message: `${name} (${email}) has requested access.${organizationName ? ` Organization: ${organizationName}` : ""}${reason ? ` Reason: ${reason}` : ""}`,
          link: "/dashboard/admin",
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = (session.user as any)?.membership;
    const isSuperAdmin = membership?.role?.type === "SYSTEM_ADMIN";
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const requests = await prisma.notification.findMany({
      where: { type: "ACCESS_REQUEST" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Fetch access requests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
