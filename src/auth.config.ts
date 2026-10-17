import type { NextAuthConfig } from "next-auth";

const PROTECTED_PREFIXES = ["/dashboard", "/groups", "/join", "/notifications", "/account"];

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const loggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const isProtected = PROTECTED_PREFIXES.some(
        (p) => path === p || path.startsWith(`${p}/`),
      );

      if (isProtected) {
        if (loggedIn) return true;
        // Send visitors to login and remember where they were going.
        const url = new URL("/login", nextUrl);
        url.searchParams.set("redirectTo", path + nextUrl.search);
        return Response.redirect(url);
      }

      // Logged-in visitors on /login or /register are sent on by those pages themselves,
      // because only the server (not this edge check) can confirm the account still exists.
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
