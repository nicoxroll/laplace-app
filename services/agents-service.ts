export class AgentsService {
  private baseUrl = "http://127.0.0.1:8000";

  /**
   * Gets all available agents for the user
   */
  public async getAllAgents(token: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents`, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error("API error response:", responseText);
        throw new Error(
          `Error al obtener agentes: ${response.status} ${responseText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error obteniendo agentes:", error);
      throw error;
    }
  }

  /**
   * Gets personal agents for the authenticated user
   */
  public async getMyAgents(token: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents/me`, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          `Error al obtener mis agentes: ${response.status} ${responseText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error obteniendo mis agentes:", error);
      throw error;
    }
  }

  /**
   * Crea un nuevo agente para el usuario autenticado
   */
  public async createAgent(
    token: string,
    name: string,
    description: string,
    knowledge_ids: number[],
    is_private: boolean = true
  ): Promise<any> {
    try {
      console.log("Creando agente con:", {
        name,
        description,
        knowledge_ids,
        is_private,
      });

      const response = await fetch(`${this.baseUrl}/api/agents/me`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent: {
            name,
            description,
            is_private,
            api_url: null,
          },
          knowledge_ids,
        }),
      });

      const responseText = await response.text();
      console.log("Respuesta del servidor (crear):", responseText);

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${responseText}`);
      }

      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error("Error creando agente:", error);
      throw error;
    }
  }

  /**
   * Actualiza un agente existente
   */
  public async updateAgent(
    token: string,
    agentId: string | number,
    name: string,
    description: string,
    knowledge_ids: number[],
    is_private: boolean = true
  ): Promise<any> {
    try {
      const numericAgentId =
        typeof agentId === "string" ? parseInt(agentId, 10) : agentId;

      console.log("Actualizando agente:", {
        id: numericAgentId,
        name,
        description,
        knowledge_ids,
        is_private,
      });

      const response = await fetch(
        `${this.baseUrl}/api/agents/${numericAgentId}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent_update: {
              name,
              description,
              is_private,
              api_url: null,
            },
            knowledge_ids,
          }),
        }
      );

      const responseText = await response.text();
      console.log("Respuesta del servidor (actualizar):", responseText);

      if (!response.ok) {
        throw new Error(
          `Error actualizando: ${response.status} ${responseText}`
        );
      }

      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error("Error actualizando agente:", error);
      throw error;
    }
  }

  /**
   * Deletes an agent
   */
  public async deleteAgent(
    token: string,
    agentId: string | number
  ): Promise<void> {
    try {
      const numericId =
        typeof agentId === "string" ? parseInt(agentId, 10) : agentId;

      console.log("Eliminando agente:", numericId);

      const response = await fetch(`${this.baseUrl}/api/agents/${numericId}`, {
        method: "DELETE",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          `Error eliminando agente: ${response.status} ${responseText}`
        );
      }

      console.log("Agente eliminado con éxito:", numericId);
    } catch (error) {
      console.error("Error eliminando agente:", error);
      throw error;
    }
  }

  /**
   * Obtiene los documentos de conocimiento asociados a un agente
   */
  public async getAgentKnowledge(
    token: string,
    agentId: string | number
  ): Promise<any[]> {
    try {
      const numericId =
        typeof agentId === "string" ? parseInt(agentId, 10) : agentId;

      console.log(`Solicitando knowledge items para agente ID ${numericId}`);

      const response = await fetch(
        `${this.baseUrl}/api/agents/${numericId}/knowledge`,
        {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const responseText = await response.text();
        console.error(
          `Error obteniendo knowledge: ${response.status} ${responseText}`
        );
        return [];
      }

      const data = await response.json();
      console.log(
        `Recibidos ${data.length} knowledge items para agente ${agentId}:`,
        data
      );
      return data;
    } catch (error) {
      console.error("Error obteniendo knowledge del agente:", error);
      return [];
    }
  }
}
