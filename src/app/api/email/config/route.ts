import { NextResponse } from "next/server";
import { requireActor, ApiError, withErrorHandling } from "@/lib/authz";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const actor = await requireActor();
  if (actor.roleType !== "SYSTEM_ADMIN" && !actor.isPlatformAdmin) {
    throw new ApiError(403, "Forbidden");
  }

  return NextResponse.json({
    host: process.env.SMTP_HOST || "",
    port: process.env.SMTP_PORT || "",
    user: process.env.SMTP_USER || "",
    from: (process.env.SMTP_FROM || "").replace(/<[^>]+>/g, "").trim() || "",
  });
});
