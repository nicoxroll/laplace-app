import { KnowledgeItem } from "@/types/sections";

export class KnowledgeService {
  private static instance: KnowledgeService;
  private baseUrl = "http://127.0.0.1:8000";

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
      // Asegúrate de enviar el token en formato correcto
      const authToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      const response = await fetch(`${this.baseUrl}/users/profile`, {
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error al obtener perfil: ${response.statusText}`);
      }

      const profile = await response.json();
      console.log("Perfil obtenido:", profile);
      return profile;
    } catch (error) {
      console.error("Error obteniendo perfil:", error);
      return this.getFallbackProfile(); // Usar perfil de respaldo
    }
  }

  /**
   * Obtiene los documentos de conocimiento asociados a un usuario específico
   * @param token Token de autenticación
   * @param userId ID del usuario
   */
  public async getUserKnowledge(
    token: string,
    userId: string = "1" // Hacer opcional el ID de usuario
  ): Promise<KnowledgeItem[]> {
    try {
      // Asegúrate de eliminar el prefijo "Bearer " si ya está presente
      const authToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

      const response = await fetch(
        `${this.baseUrl}/knowledge/items/user/${userId}`,
        {
          headers: {
            Authorization: authToken,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Status:", response.status);

      if (!response.ok) {
        console.error("Error response:", await response.text());
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Knowledge service error:", error);
      return this.getFallbackKnowledgeData(userId);
    }
  }

  // Añade este método para intercambiar tokens
  public async exchangeToken(
    oauthToken: string,
    provider: string
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/token/exchange`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: provider,
          oauth_token: oauthToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error exchanging token: ${response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Error exchanging token:", error);
      throw error;
    }
  }

  /**
   * Crea un nuevo item de conocimiento para el usuario actual
   */
  public async createKnowledgeItem(
    token: string,
    name: string,
    description: string,
    content: string
  ): Promise<KnowledgeItem> {
    try {
      const authToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

      // Enviamos solo los campos necesarios, el backend generará el hash
      const requestBody = {
        name,
        description,
        content,
        // No incluir content_hash, será generado en el backend
      };

      console.log("Enviando solicitud:", JSON.stringify(requestBody));

      const response = await fetch(`${this.baseUrl}/knowledge/items`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log("Respuesta del servidor:", responseText);

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${responseText}`);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error("Error creating knowledge:", error);
      throw error;
    }
  }

  /**
   * Obtiene información de depuración sobre el modelo Knowledge
   */
  public async getKnowledgeModelInfo(token: string): Promise<any> {
    try {
      const authToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

      const response = await fetch(`${this.baseUrl}/knowledge/debug-model`, {
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
      });

      return await response.json();
    } catch (error) {
      console.error("Error getting model info:", error);
      throw error;
    }
  }

  // Perfil de respaldo para desarrollo
  private getFallbackProfile(): any {
    return {
      id: "1",
      username: "desarrollo_usuario",
      name: "Usuario Desarrollo",
      email: "dev@example.com",
      avatar: "https://ui-avatars.com/api/?name=Dev+User",
      is_superuser: false,
      is_system_user: false,
    };
  }

  // Cambiado de private a public para permitir acceso desde componentes
  public getFallbackKnowledgeData(userId: string): KnowledgeItem[] {
    return [
      {
        id: "1",
        name: "Reglas",
        description: "Documentos de normas",
        size: "540KB",
        type: "pdf",
        created_at: "2025-01-15",
        updated_at: "2025-02-20",
        user_id: userId,
      },
      {
        id: "2",
        name: "Guía de arquitectura",
        description: "Principios de diseño y estándares",
        size: "1.2MB",
        type: "docx",
        created_at: "2025-01-10",
        updated_at: "2025-02-18",
        user_id: userId,
      },
      {
        id: "3",
        name: "Manual de operaciones",
        description: "Procedimientos operativos estándar",
        size: "750KB",
        type: "md",
        created_at: "2025-02-05",
        updated_at: "2025-02-22",
        user_id: userId,
      },
    ];
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
