"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { loginSchema, registerSchema, type FormState } from "@/lib/validations";

// Only allow relative paths on this site, so the redirect can't be abused
// to send people to another domain.
function safeRedirect(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { name, email, password } = parsed.data;
  const redirectTo = safeRedirect(formData.get("redirectTo"));

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: ["An account with this email already exists."] } };
  }

  try {
    await db.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
    });
  } catch {
    // Two sign-ups with the same email at the same moment
    return { fieldErrors: { email: ["An account with this email already exists."] } };
  }

  // signIn throws a redirect on success, so it must not be wrapped in a catch-all.
  await signIn("credentials", { email, password, redirectTo });
  return {};
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const redirectTo = safeRedirect(formData.get("redirectTo"));

  try {
    await signIn("credentials", { ...parsed.data, redirectTo });
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
