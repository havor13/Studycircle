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

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
