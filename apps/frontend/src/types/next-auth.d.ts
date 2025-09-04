import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    token?: string; 
  }

  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    accessToken?: string;
  }
}