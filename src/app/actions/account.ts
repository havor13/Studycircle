"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
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
