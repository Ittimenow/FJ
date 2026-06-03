import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    user: {
      id: string;
      displayName: string;
      role: "USER" | "HOST" | "ADMIN";
      status: "ACTIVE" | "BLOCKED" | "DELETED";
    } & DefaultSession["user"];
  }

  interface User {
    accessToken?: string;
    displayName?: string;
    role?: string;
    status?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    userId?: string;
    displayName?: string;
    role?: string;
    status?: string;
  }
}
