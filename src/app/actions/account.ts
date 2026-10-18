"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appUrl, mailConfigured, sendMail } from "@/lib/mailer";
import { changePasswordSchema, type FormState } from "@/lib/validations";

export type PasswordState = FormState & { done?: boolean };

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please log in again." };

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Please log in again." };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { fieldErrors: { currentPassword: ["That is not your current password."] } };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });

  return { done: true };
}

export type SettingResult = { ok: boolean; message: string };

/** Turns notification emails on or off for the logged-in user. */
export async function saveEmailPreference(enabled: boolean): Promise<SettingResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Please log in again." };

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { emailNotifications: Boolean(enabled) },
    });
  } catch {
    return { ok: false, message: "Could not save that. Try again." };
  }
  return { ok: true, message: enabled ? "Email notifications are on." : "Email notifications are off." };
}

// Best-effort limit so the test button cannot be used to flood an inbox.
const lastTest = new Map<string, number>();

/** Sends one test email to the logged-in user, so they can check the setup works. */
export async function sendTestEmail(): Promise<SettingResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Please log in again." };
  if (!mailConfigured()) return { ok: false, message: "Email is not set up on this server yet." };

  const now = Date.now();
  const last = lastTest.get(session.user.id) ?? 0;
  if (now - last < 60_000) return { ok: false, message: "Wait a minute before sending another test." };
  lastTest.set(session.user.id, now);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });
  if (!user) return { ok: false, message: "Please log in again." };

  const result = await sendMail({
    to: user.email,
    subject: "StudyCircle test email",
    text: `Hi ${user.name},\n\nThis is a test email from StudyCircle. If you can read it, email notifications work.\n\n${appUrl()}/account`,
  });
  return result.ok
    ? { ok: true, message: `Test email sent to ${user.email}. Check your inbox and spam folder.` }
    : { ok: false, message: result.error };
}
