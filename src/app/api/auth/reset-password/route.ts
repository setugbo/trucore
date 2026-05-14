import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generateToken } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST - Request password reset
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: "If that email exists, reset instructions have been sent." });
    }

    const resetToken = generateToken(32);
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token (using a simple approach - store in user record or create a token table)
    // For now we'll use the VerificationToken model from Prisma
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: resetToken,
        expires: resetExpires,
      },
    });

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://trucore.vercel.app"}/reset-password?token=${resetToken}`;

    try {
      await sendEmail({
        to: email,
        subject: "TRUCORE - Password Reset Request",
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
            <div style="text-align:center;margin-bottom:32px;">
              <h1 style="color:#5B21B6;font-size:28px;font-weight:700;">TRUCORE</h1>
              <p style="color:#6B7280;font-size:14px;">Password Reset Request</p>
            </div>
            <div style="background:#FFFFFF;border-radius:16px;padding:40px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
              <h2 style="color:#111827;font-size:24px;font-weight:600;margin-bottom:16px;">Reset Your Password</h2>
              <p style="color:#6B7280;font-size:16px;line-height:1.6;margin-bottom:24px;">
                You requested a password reset for your TRUCORE account. Click the button below to set a new password.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetLink}" 
                   style="background:#5B21B6;color:#FFFFFF;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color:#9CA3AF;font-size:14px;margin-top:24px;">
                This link expires in 1 hour. If you did not request this reset, please ignore this email.
              </p>
            </div>
            <div style="text-align:center;margin-top:24px;">
              <p style="color:#9CA3AF;font-size:12px;">&copy; 2026 TRUCORE. All rights reserved.</p>
            </div>
          </div>
        `,
      });
    } catch {
      console.error("Reset email sending failed (SMTP may not be configured)");
    }

    return NextResponse.json({ message: "If that email exists, reset instructions have been sent." });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
