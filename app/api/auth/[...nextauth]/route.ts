import type { AuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GitlabProvider from "next-auth/providers/gitlab";

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
    GitlabProvider({
      clientId: process.env.GITLAB_ID || "",
      clientSecret: process.env.GITLAB_SECRET || "",
      authorization: {
        params: {
          scope: "read_user read_api read_repository",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Solo intentar sincronizar si tenemos toda la información necesaria
        if (user && account && profile) {
          const apiUrl = "http://127.0.0.1:8000";

          // Preparar los datos para el backend con mejor manejo de campos
          const userData = {
            provider_user_id: user.id || profile.sub || "", // Mejorar compatibilidad
            provider: account.provider,
            username:
              (profile as any).login ||
              (profile as any).username ||
              user.email?.split("@")[0] ||
              "user",
            email: user.email,
            name: user.name,
            avatar: user.image,
            access_token: account.access_token, // Incluir token para operaciones posteriores
          };

          console.log("Enviando datos a backend:", apiUrl, account.provider);

          // Enviar datos al backend
          const response = await fetch(
            `${apiUrl}/auth/${account.provider}/callback`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(userData),
            }
          );

          if (!response.ok) {
            console.error(
              "Error al registrar usuario en backend:",
              await response.text()
            );
          } else {
            console.log(
              "Usuario registrado/actualizado correctamente en backend"
            );
          }
        }
      } catch (error) {
        console.error("Error conectando con API:", error);
      }

      // Continuar con el login siempre
      return true;
    },

    async jwt({ token, account, profile }) {
      if (account) {
        // Almacenar el token sin el prefijo 'Bearer '
        token.accessToken = account.access_token; // Asegúrate que no tenga ya el prefijo 'Bearer '
        token.provider = account.provider;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.accessToken = token.accessToken as string;
        session.user.provider = token.provider as string;
        session.user.id = token.sub as string; // Añadir el ID del usuario a la sesión
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
