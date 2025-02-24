import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GitLabProvider from "next-auth/providers/gitlab"
import type { AuthOptions, Session } from "next-auth"

export const authOptions: AuthOptions = {
  providers: [
    GitLabProvider({
      clientId: process.env.GITLAB_ID!,
      clientSecret: process.env.GITLAB_SECRET!,
      authorization: {
        params: {
          scope: 'read_user api read_api read_repository',
        },
      },
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.provider = token.provider as string
      return session
    },
  },
}

declare module "next-auth" {
  interface Session {
    provider?: string;
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }

