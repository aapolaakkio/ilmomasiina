import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/env";

import type { UserID } from "./models";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
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
      const firstUser = await db.query.users.findFirst({ columns: { id: true } });
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
          columns: { id: true },
        });
        if (dbUser) {
          token.dbUserId = dbUser.id;
        }
      }
      return token;
    },
  },
});

/** Get admin user info from the current Auth.js session. Returns null if not authenticated. */
export async function getAdminSession(): Promise<{ user: UserID; email: string; role: "admin" | "user" } | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const dbUser = await db.query.users.findFirst({
    where: { email: session.user.email },
    columns: { id: true, role: true },
  });
  if (!dbUser) return null;

  return { user: dbUser.id as UserID, email: session.user.email, role: dbUser.role };
}
