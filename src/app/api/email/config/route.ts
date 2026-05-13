import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    host: process.env.SMTP_HOST || "",
    port: process.env.SMTP_PORT || "",
    user: process.env.SMTP_USER || "",
    from: (process.env.SMTP_FROM || "").replace(/<[^>]+>/g, "").trim() || "",
  });
}
