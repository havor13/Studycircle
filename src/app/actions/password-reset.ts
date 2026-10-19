"use server";

import { after } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { appUrl, isDeliverable, mailConfigured, sendMail } from "@/lib/mailer";
import {
  MAX_RESET_REQUESTS_PER_HOUR,
  RESET_LINK_MINUTES,
  hashResetToken,
  looksLikeResetToken,
  newResetToken,
} from "@/lib/password-reset";

export type ResetState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  done?: boolean;
};

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

const newPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
    confirmPassword: z.string().min(1, "Type the new password again."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords do not match.",
  });

/**
 * Step 1: the person types their email. The answer is ALWAYS the same ("if it exists, a link is on its way"),
 * so this form cannot be used to find out who has an account.
 */
export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  if (!mailConfigured()) {
    return { error: "Password reset by email is not set up on this server yet." };
  }

  const parsed = emailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { email } = parsed.data;

  try {
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (user && isDeliverable(email)) {
      const now = Date.now();
      const recent = await db.passwordReset.count({
        where: { userId: user.id, createdAt: { gt: new Date(now - 3_600_000) } },
      });

      if (recent < MAX_RESET_REQUESTS_PER_HOUR) {
        const token = newResetToken();
        // Only the newest link works; older unused ones are removed. Old used/expired rows are tidied up too.
        await db.passwordReset.deleteMany({
          where: {
            userId: user.id,
            OR: [{ usedAt: null }, { createdAt: { lt: new Date(now - 86_400_000) } }],
          },
        });
        await db.passwordReset.create({
          data: {
            userId: user.id,
            tokenHash: hashResetToken(token),
            expiresAt: new Date(now + RESET_LINK_MINUTES * 60_000),
          },
        });

        const link = `${appUrl()}/reset-password/${token}`;
        after(() =>
          sendMail({
            to: email,
            subject: "Reset your StudyCircle password",
            text:
              `Someone asked to reset the password for this StudyCircle account.\n\n` +
              `Choose a new password here (the link works for ${RESET_LINK_MINUTES} minutes, once):\n${link}\n\n` +
              `If this was not you, ignore this email. Your password stays the same.`,
          }),
        );
      }
    }
  } catch (error) {
    // Never reveal a problem that could tell an outsider something about the account.
    console.error("Password reset request failed", error);
  }

  return { done: true };
}

/** Step 2: the person opened the emailed link and chose a new password. */
export async function resetPassword(token: string, _prev: ResetState, formData: FormData): Promise<ResetState> {
  if (!looksLikeResetToken(token)) return { error: "This link is not valid. Ask for a new one." };

  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const row = await db.passwordReset.findUnique({ where: { tokenHash: hashResetToken(token) } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return { error: "This link has expired or was already used. Ask for a new one." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    // This link is spent, and so is every other link that person had.
    db.passwordReset.deleteMany({ where: { userId: row.userId } }),
  ]);

  return { done: true };
}
