import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import nodemailer from "nodemailer";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { to } = await request.json();
    if (!to) return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@trucore.app",
      to,
      subject: "TRUCORE - Test Email",
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h1 style="color:#5B21B6;font-size:24px;">TRUCORE</h1>
          <p style="color:#6B7280;font-size:16px;">This is a test email from your TRUCORE instance.</p>
          <p style="color:#6B7280;font-size:14px;">If you received this, your SMTP configuration is working correctly.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: "Test email sent successfully" });
  } catch (error: any) {
    console.error("Test email error:", error);
    return NextResponse.json({ error: error.message || "Failed to send test email" }, { status: 500 });
  }
}
