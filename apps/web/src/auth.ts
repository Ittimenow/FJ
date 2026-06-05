import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { apiBaseUrl } from "./lib/api";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.JWT_SECRET ?? "dev-secret",
  trustHost: true,
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const response = await fetch(`${apiBaseUrl()}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password
          })
        });

        if (!response.ok) return null;
        const data = (await response.json()) as {
          accessToken: string;
          user: {
            id: string;
            email: string;
            displayName: string;
            avatarUrl: string | null;
            role: "USER" | "HOST" | "ADMIN";
            status: "ACTIVE" | "BLOCKED" | "DELETED";
          };
        };

        return {
          ...data.user,
          name: data.user.displayName,
          accessToken: data.accessToken
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const authenticatedUser = user as {
          accessToken?: string;
          displayName?: string;
          role?: string;
          status?: string;
        };
        if (authenticatedUser.accessToken) {
          token.accessToken = authenticatedUser.accessToken;
        }
        if (user.id) token.userId = user.id;
        if (authenticatedUser.displayName) {
          token.displayName = authenticatedUser.displayName;
        }
        if (authenticatedUser.role) token.role = authenticatedUser.role;
        if (authenticatedUser.status) token.status = authenticatedUser.status;
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = String(token.accessToken ?? "");
      session.user.id = String(token.userId ?? "");
      session.user.displayName = String(token.displayName ?? session.user.name ?? "");
      session.user.role = String(token.role ?? "USER") as "USER" | "HOST" | "ADMIN";
      session.user.status = String(token.status ?? "ACTIVE") as
        | "ACTIVE"
        | "BLOCKED"
        | "DELETED";
      return session;
    }
  }
});
