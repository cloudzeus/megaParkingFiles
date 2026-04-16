import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no Prisma, no bcrypt).
 * Used by middleware. Full auth with adapter lives in auth.ts.
 */
const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" as const, maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "EMPLOYEE";
        token.companyId = (user as { companyId?: number }).companyId ?? 0;
        token.departmentId = (user as { departmentId?: number | null }).departmentId ?? null;
      }
      if (trigger === "update" && session) {
        token.role = (session as { role?: string }).role ?? token.role;
        token.companyId = (session as { companyId?: number }).companyId ?? token.companyId;
        token.departmentId = (session as { departmentId?: number | null }).departmentId ?? token.departmentId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token && typeof token.id === "string") {
        session.user.id = token.id;
        (session.user as { role: string }).role = token.role as string;
        session.user.companyId = token.companyId as number;
        session.user.departmentId = token.departmentId as number | null;
      }
      return session;
    },
    authorized({ auth: authState, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/api/auth")) return true;
      const isDashboard =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/files") ||
        pathname.startsWith("/departments") ||
        pathname.startsWith("/reports") ||
        pathname.startsWith("/gdpr");
      const isAuthPage = pathname === "/login";
      if (isDashboard && !authState) return false;
      if (isAuthPage && authState) return Response.redirect(new URL("/dashboard", request.url));
      return true;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {},
      async authorize() {
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;

export default authConfig;

/** Edge-safe auth for middleware (no Prisma). */
export const { auth: edgeAuth } = NextAuth(authConfig);
