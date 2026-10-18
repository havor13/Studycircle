import nodemailer from "nodemailer";

/**
 * Sends email through any SMTP account (made for a Gmail account with an App password).
 * If SMTP_USER or SMTP_PASS is missing, email is simply switched off and nothing breaks.
 */

export function mailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** The public address of the site, used for links inside emails. */
export function appUrl() {
  const explicit = process.env.APP_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const base = explicit || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return base.replace(/\/+$/, "");
}

/** Skips addresses that can never receive mail (the demo users use @studycircle.test). */
export function isDeliverable(address: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) && !/\.(test|invalid|example|localhost)$/i.test(address);
}

let transport: nodemailer.Transporter | null = null;

function getTransport() {
  if (!mailConfigured()) return null;
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port,
      secure: port === 465,
      pool: true,
      maxConnections: 3,
      auth: {
        user: process.env.SMTP_USER!.trim(),
        // Google shows App passwords in groups of four with spaces; the spaces are not part of it.
        pass: process.env.SMTP_PASS!.replace(/\s+/g, ""),
      },
    });
  }
  return transport;
}

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendMail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<SendResult> {
  const mailer = getTransport();
  if (!mailer) return { ok: false, error: "Email is not set up on this server yet." };

  const user = process.env.SMTP_USER!.trim();
  try {
    await mailer.sendMail({
      from: process.env.MAIL_FROM?.trim() || `StudyCircle <${user}>`,
      to,
      // Subjects can contain user-written text; never let a line break through.
      subject: subject.replace(/[\r\n]+/g, " ").slice(0, 150),
      text,
    });
    return { ok: true };
  } catch (error) {
    const code = (error as { code?: string }).code;
    console.error("Email failed:", code ?? error);
    return {
      ok: false,
      error:
        code === "EAUTH"
          ? "The mail server refused the login. Check SMTP_USER, and that SMTP_PASS is an App password."
          : "The email could not be sent. Check the server logs.",
    };
  }
}
