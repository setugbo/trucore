import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@trucore.app",
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error };
  }
}

export function renderInviteEmail({
  orgName,
  inviterName,
  inviteLink,
}: {
  orgName: string;
  inviterName: string;
  inviteLink: string;
}) {
  return `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #5B21B6; font-size: 28px; font-weight: 700;">TRUCORE</h1>
        <p style="color: #6B7280; font-size: 14px;">Speak Freely. Report Safely.</p>
      </div>
      <div style="background: #FFFFFF; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 16px;">
          You've Been Invited!
        </h2>
        <p style="color: #6B7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on TRUCORE.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteLink}" 
             style="background: #5B21B6; color: #FFFFFF; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #9CA3AF; font-size: 14px; margin-top: 24px;">
          This link will expire in 7 days. If you did not expect this invitation, please ignore this email.
        </p>
      </div>
      <div style="text-align: center; margin-top: 24px;">
        <p style="color: #9CA3AF; font-size: 12px;">&copy; 2026 TRUCORE. All rights reserved.</p>
      </div>
    </div>
  `;
}

export function renderCaseUpdateEmail({
  caseId,
  status,
  message,
  dashboardLink,
}: {
  caseId: string;
  status: string;
  message: string;
  dashboardLink: string;
}) {
  return `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #5B21B6; font-size: 28px; font-weight: 700;">TRUCORE</h1>
        <p style="color: #6B7280; font-size: 14px;">Speak Freely. Report Safely.</p>
      </div>
      <div style="background: #FFFFFF; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 16px;">
          Case Update: ${caseId}
        </h2>
        <p style="color: #6B7280; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          Status: <strong>${status}</strong>
        </p>
        <p style="color: #6B7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          ${message}
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardLink}" 
             style="background: #5B21B6; color: #FFFFFF; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            View Case
          </a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 24px;">
        <p style="color: #9CA3AF; font-size: 12px;">&copy; 2026 TRUCORE. All rights reserved.</p>
      </div>
    </div>
  `;
}
