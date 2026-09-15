import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import type { User } from "@/models";

/**
 * Email service.
 * Uses SMTP when configured; otherwise logs emails to the server console
 * (development mode). Never throws - email failures must not break flows.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  if (!env.SMTP_HOST) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? "" } : undefined,
  });
  return transporter;
}

export function absoluteUrl(path: string): string {
  return `${env.APP_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

const layout = (title: string, body: string) => `
<!doctype html>
<html>
  <body style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;padding:32px;margin:0">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <h1 style="font-size:20px;color:#09090b;margin:0 0 16px">${title}</h1>
      ${body}
      <p style="color:#71717a;font-size:12px;margin-top:32px">You are receiving this email because of activity on your ${env.APP_URL ? "SEO Tools" : "SEO Tools"} account.</p>
    </div>
  </body>
</html>`;

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#18181b;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">${label}</a>`;

export class EmailService {
  async send(payload: EmailPayload): Promise<void> {
    const transport = getTransporter();
    if (!transport) {
      logger.info("email_console_transport", {
        to: payload.to,
        subject: payload.subject,
        preview: payload.text.slice(0, 500),
      });
      return;
    }
    try {
      await transport.sendMail({ from: env.SMTP_FROM, ...payload });
    } catch (err) {
      logger.error("email_send_failed", { to: payload.to, subject: payload.subject, error: err });
    }
  }

  async sendVerificationEmail(user: User, token: string): Promise<void> {
    const link = absoluteUrl(`/verify-email?token=${encodeURIComponent(token)}`);
    await this.send({
      to: user.email,
      subject: "Verify your email address",
      text: `Welcome! Please verify your email address: ${link}\nThis link expires in 24 hours.`,
      html: layout(
        "Verify your email address",
        `<p style="color:#3f3f46;font-size:14px;line-height:1.6">Hi ${user.getFullName()},</p>
         <p style="color:#3f3f46;font-size:14px;line-height:1.6">Welcome to SEO Tools! Please confirm your email address to activate your account.</p>
         <p style="margin:24px 0">${button(link, "Verify email address")}</p>
         <p style="color:#71717a;font-size:12px">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>`
      ),
    });
  }

  async sendPasswordResetEmail(user: User, token: string): Promise<void> {
    const link = absoluteUrl(`/reset-password?token=${encodeURIComponent(token)}`);
    await this.send({
      to: user.email,
      subject: "Reset your password",
      text: `Reset your password: ${link}\nThis link expires in 1 hour.`,
      html: layout(
        "Reset your password",
        `<p style="color:#3f3f46;font-size:14px;line-height:1.6">Hi,</p>
         <p style="color:#3f3f46;font-size:14px;line-height:1.6">We received a request to reset the password for your account.</p>
         <p style="margin:24px 0">${button(link, "Choose a new password")}</p>
         <p style="color:#71717a;font-size:12px">This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.</p>`
      ),
    });
  }
}

export const emailService = new EmailService();
