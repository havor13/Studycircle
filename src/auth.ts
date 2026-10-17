import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Runs on the server (not the edge), so it can ask the database whether the
    // account still exists. Returning null ends the session for a deleted user.
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        return token;
      }
      if (!token.id) return null;
      const exists = await db.user.findUnique({
        where: { id: token.id as string },
        select: { id: true },
      });
      return exists ? token : null;
    },
  },
  providers: [
    Credentials({
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
});
