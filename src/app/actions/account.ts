"use server";

import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { appUrl, mailConfigured, sendMail } from "@/lib/mailer";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EMAIL_KIND_OPTIONS } from "@/lib/email-kinds";
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

const profileSchema = z.object({
  name: z.string().trim().min(2, "Your name must be at least 2 characters.").max(60, "Keep your name under 60 characters."),
  bio: z.string().trim().max(200, "Keep your bio under 200 characters."),
});

export type ProfileState = FormState & { done?: boolean };

/** Changes the logged-in person's display name and short bio. The email is not changed here. */
export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please log in again." };

  const parsed = profileSchema.safeParse({
    name: formData.get("name") ?? "",
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await db.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name, bio: parsed.data.bio || null },
  });

  revalidatePath("/", "layout");
  return { done: true };
}

export type KindsState = { done?: boolean; error?: string };

/** Saves which kinds of email you want. A ticked box means "send it". */
export async function saveEmailKinds(_prev: KindsState, formData: FormData): Promise<KindsState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please log in again." };

  // Only the kinds on our own list count, whatever the browser sent.
  const wanted = new Set(formData.getAll("kinds").map(String));
  const emailOff = EMAIL_KIND_OPTIONS.map((o) => o.kind).filter((kind) => !wanted.has(kind));

  await db.user.update({
    where: { id: session.user.id },
    data: { emailOff, emailDirectMessages: formData.get("dm") === "on" },
  });
  revalidatePath("/account");
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

/** Logs this account out on EVERY device, including this one, then sends the person to the login page. */
export async function logoutEverywhere() {
  const session = await auth();
  if (!session?.user?.id) return;
  await db.user.update({ where: { id: session.user.id }, data: { tokenVersion: { increment: 1 } } });
  await signOut({ redirectTo: "/login" });
}
