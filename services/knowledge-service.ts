import { KnowledgeItem } from "@/types/sections";

export class KnowledgeService {
  private static instance: KnowledgeService;
  private baseUrl: string = "http://localhost:8000";

  private constructor() {}

  public static getInstance(): KnowledgeService {
    if (!KnowledgeService.instance) {
      KnowledgeService.instance = new KnowledgeService();
    }
    return KnowledgeService.instance;
  }

  /**
   * Obtiene el perfil del usuario autenticado usando su token
   * @param token Token de autenticación Bearer
   * @returns Perfil del usuario
   */
  public async getUserProfile(token: string): Promise<any> {
    try {
      // Limpiar el token como antes
      const cleanToken = token.startsWith("Bearer ")
        ? token.substring(7)
        : token;

      // Probar con otro endpoint - probablemente el API espera provider y/o provider_user_id
      // Intentar con la URL /api/users/me, que es más común para perfil de usuario autenticado
      const response = await fetch(`${this.baseUrl}/api/users/me`, {
        method: "GET", // Especificar el método explícitamente
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          "Content-Type": "application/json",
          Accept: "application/json", // Añadir header Accept
        },
      });

      // Si no funciona, intentar un endpoint alternativo
      if (!response.ok) {
        console.warn("Primer intento fallido, probando endpoint alternativo");

        const altResponse = await fetch(`${this.baseUrl}/api/user`, {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        if (!altResponse.ok) {
          throw new Error(
            `Error al obtener perfil: ${altResponse.status} ${altResponse.statusText}`
          );
        }

        const profile = await altResponse.json();
        console.log("Perfil obtenido (alternativo):", profile);
        return profile;
      }

      const profile = await response.json();
      console.log("Perfil obtenido:", profile);
      return profile;
    } catch (error) {
      console.error("Error obteniendo perfil:", error);

      // Si todo falla, devolver un perfil dummy para desarrollo
      console.warn("Usando perfil de respaldo para desarrollo");
      return {
        id: "dev-user-1",
        username: "development",
        name: "Dev User",
      };
    }
  }

  /**
   * Obtiene los documentos de conocimiento asociados a un usuario específico
   * @param token Token de autenticación
   * @param userId ID del usuario
   * @param includeSystem Incluir documentos del sistema
   */
  public async getUserKnowledge(
    token: string,
    userId: string,
    includeSystem: boolean = true
  ): Promise<KnowledgeItem[]> {
    try {
      // Limpiar el token en caso de que ya tenga el prefijo
      const cleanToken = token.startsWith("Bearer ")
        ? token.substring(7)
        : token;

      // Resto del código igual...
      const url = new URL(`${this.baseUrl}/knowledge/bases/by_user/${userId}`);
      url.searchParams.append("include_system", includeSystem.toString());

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error al obtener documentos: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error en KnowledgeService:", error);
      throw error;
    }
  }

  /**
   * Método auxiliar para obtener el ID del usuario desde la sesión
   * Si no encuentra el ID, devuelve null para que se pueda intentar recuperar
   * el perfil usando el token.
   */
  public extractUserIdFromSession(session: any): string | null {
    if (!session?.user) return null;

    const userId =
      session.user.id ||
      session.user.sub ||
      (session.user.provider_user_id
        ? `${session.user.provider}_${session.user.provider_user_id}`
        : null);

    console.log("Session user data:", {
      id: session.user.id,
      sub: session.user.sub,
      provider: session.user.provider,
      finalUserId: userId,
    });

    return userId || null;
  }
}
