"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { loginSchema, registerSchema, type FormState } from "@/lib/validations";

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: ["An account with this email already exists."] } };
  }

  await db.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
  });

  // signIn throws a redirect on success, so it must not be wrapped in a catch-all.
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return {};
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email or password is incorrect." };
    }
    throw error; // re-throw the redirect
  }
  return {};
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
