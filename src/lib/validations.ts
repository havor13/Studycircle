import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name (at least 2 characters).").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Use 72 characters or fewer."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const groupSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters.").max(60),
  subject: z.string().trim().max(60).optional(),
  description: z.string().trim().max(500).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Use 72 characters or fewer."),
    confirmPassword: z.string().min(1, "Type the new password again."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two new passwords do not match.",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the current one.",
  });

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
