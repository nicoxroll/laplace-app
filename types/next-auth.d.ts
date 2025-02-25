import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      accessToken?: string;
      email?: string;
      image?: string;
      name?: string;
    } & DefaultSession["user"];
  }
}
