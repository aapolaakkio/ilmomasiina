import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/env";

import type { UserID, UserRole } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    dbUserId?: UserID;
    dbUserRole?: UserRole;
  }
}

const testCredentialsProvider = Credentials({
  credentials: { email: { type: "email" } },
  async authorize(credentials) {
    const email = credentials.email as string;
    if (!email) return null;
    const dbUser = await db.query.users.findFirst({
      where: { email },
      columns: { id: true },
    });
    if (!dbUser) return null;
    return { id: String(dbUser.id), email };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, ...(env.THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED ? [testCredentialsProvider] : [])],
  session: { strategy: "jwt", maxAge: env.SESSION_TTL },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email;
      if (!email) return false;

      // If no users exist, auto-accept and create the first admin
      const firstUser = await db.query.users.findFirst({
        columns: { id: true },
      });
      if (!firstUser) {
        await db.insert(users).values({ email });
        return true;
      }

      // Check allowlist
      const allowed = await db.query.users.findFirst({
        where: { email },
        columns: { id: true },
      });
      return !!allowed;
    },

    async jwt({ token }) {
      if (token.email) {
        const dbUser = await db.query.users.findFirst({
          where: { email: token.email },
          columns: { id: true, role: true },
        });
        if (dbUser) {
          token.dbUserId = dbUser.id;
          token.dbUserRole = dbUser.role;
        }
      }
      return token;
    },

    session({ session, token }) {
      session.dbUserId = token.dbUserId as UserID;
      session.dbUserRole = token.dbUserRole as UserRole;
      return session;
    },
  },
});

/** Get admin user info from the current Auth.js session. Returns null if not authenticated. */
export async function getAdminSession() {
  const session = await auth();
  if (!session?.user?.email) return null;

  // Read from JWT-populated session fields (avoids extra DB query)
  if (session.dbUserId != null && session.dbUserRole) {
    return {
      user: session.dbUserId,
      email: session.user.email,
      role: session.dbUserRole,
    };
  }

  // Fallback: fetch from DB if session doesn't have the data yet
  const dbUser = await db.query.users.findFirst({
    where: { email: session.user.email },
    columns: { id: true, role: true },
  });
  if (!dbUser) return null;

  return {
    user: dbUser.id,
    email: session.user.email,
    role: dbUser.role,
  };
}
