import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail, renderCaseUpdateEmail } from "@/lib/email";
import { checkRateLimit, getClientIp, rateLimited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`case-track:${ip}`, { limit: 20, windowMs: 60 * 1000 });
    if (!allowed) return rateLimited();

    const caseItem = await prisma.case.findUnique({ where: { reporterToken: params.token } });
    if (!caseItem) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { content } = await request.json();
    if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

    const message = await prisma.caseMessage.create({
      data: { caseId: caseItem.id, senderId: null, content, isFromReporter: true },
    });

    // Notify all org admins about the new message
    const orgAdmins = await prisma.membership.findMany({
      where: { organizationId: caseItem.organizationId, role: { type: { in: ["MODULE_ADMIN", "SYSTEM_ADMIN"] } } },
      include: { user: true },
    });

    for (const m of orgAdmins) {
      await prisma.notification.create({
        data: {
          organizationId: caseItem.organizationId,
          userId: m.user.id,
          type: "CASE_UPDATED",
          title: `Case ${caseItem.caseId}: New Reply from Reporter`,
          message: `"${content.substring(0, 100)}"`,
          link: `/dashboard/cases/${caseItem.id}`,
        },
      });

      try {
        await sendEmail({
          to: m.user.email,
          subject: `TRUCORE - New Reply: ${caseItem.caseId}`,
          html: renderCaseUpdateEmail({
            caseId: caseItem.caseId,
            status: caseItem.status,
            message: `A new reply was sent by the reporter: "${content.substring(0, 200)}"`,
            dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://trucore.vercel.app"}/dashboard/cases/${caseItem.id}`,
          }),
        });
      } catch (e) { console.error("Reporter reply email failed:", e); }
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Track message create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
