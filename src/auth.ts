import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations";
import { MAX_FAILED_PER_EMAIL, MAX_FAILED_PER_IP, clientIp, windowStart } from "@/lib/login-limits";

// Checking a password for an account that does not exist should take as long as for one that does,
// otherwise the response time tells a stranger which emails are registered.
let dummyHash: Promise<string> | null = null;
function getDummyHash() {
  dummyHash ??= bcrypt.hash("not-a-real-password", 12);
  return dummyHash;
}

async function recordFailure(email: string, ip: string | null) {
  try {
    await db.loginAttempt.create({ data: { email, ip } });
    // Old rows are no longer needed; tidy them up now and then.
    if (Math.random() < 0.05) {
      await db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
    }
  } catch (error) {
    console.error("Could not record a failed login", error);
  }
}

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
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ip = clientIp(request?.headers?.get("x-forwarded-for"));
        const since = windowStart();

        // Too many wrong passwords recently for this account or from this network? Stop before checking anything.
        const [forEmail, forIp] = await Promise.all([
          db.loginAttempt.count({ where: { email, createdAt: { gt: since } } }),
          ip ? db.loginAttempt.count({ where: { ip, createdAt: { gt: since } } }) : Promise.resolve(0),
        ]);
        if (forEmail >= MAX_FAILED_PER_EMAIL || forIp >= MAX_FAILED_PER_IP) return null;

        const user = await db.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user ? user.passwordHash : await getDummyHash());

        if (!user || !valid) {
          await recordFailure(email, ip);
          return null;
        }

        // A good login clears this account's recent failures.
        await db.loginAttempt.deleteMany({ where: { email } }).catch(() => undefined);
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
});
