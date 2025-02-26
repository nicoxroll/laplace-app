import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      accessToken?: string;
      provider?: string;
      email?: string;
      image?: string;
      name?: string;
    } & DefaultSession["user"];
  }

  interface JWT {
    accessToken?: string;
    provider?: string;
    refreshToken?: string;
  }
}
