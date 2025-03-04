import { AgentsService } from "@/services/agents-service";
import { KnowledgeService } from "@/services/knowledge-service";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

// Define Agent type
export interface Agent {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  is_system_agent: boolean;
  knowledge_id: number;
  knowledge_base_name?: string;
  created_at: string;
}

export interface KnowledgeBase {
  id: number;
  name: string;
  description?: string;
  is_system_base: boolean;
}

export function useAgents(repository: any) {
  const { data: session } = useSession();
  const [agentsData, setAgentsData] = useState<Agent[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [creating, setCreating] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    is_private: true,
    api_url: "",
  });
  const [selectedKnowledge, setSelectedKnowledge] = useState<any[]>([]);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const agentsService = new AgentsService();
  const knowledgeService = KnowledgeService.getInstance();

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewAgent((prev) => ({ ...prev, [name]: value }));
  };

  // Modificar handleSaveAgent

  const handleSaveAgent = async () => {
    if (!session?.user?.accessToken) {
      setError("No hay sesión activa");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const provider = session.user.provider || "github";
      const jwtToken = await knowledgeService.exchangeToken(
        session.user.accessToken,
        provider
      );

      // Extraer todos los IDs de knowledge seleccionados
      const knowledgeIds = selectedKnowledge
        .map((item) => parseInt(String(item.id), 10))
        .filter((id) => !isNaN(id));

      console.log("IDs de conocimiento a guardar:", knowledgeIds);

      if (knowledgeIds.length === 0) {
        setError("Debe seleccionar al menos un conocimiento");
        setCreating(false);
        return;
      }

      if (modalMode === "create") {
        await agentsService.createAgent(
          `Bearer ${jwtToken}`,
          newAgent.name,
          newAgent.description || "",
          knowledgeIds,
          true // Always private
        );
      } else {
        if (!currentAgent) return;

        const agentId = parseInt(String(currentAgent.id), 10);
        await agentsService.updateAgent(
          `Bearer ${jwtToken}`,
          agentId,
          newAgent.name,
          newAgent.description || "",
          knowledgeIds,
          true // Always private
        );
      }

      setModalOpen(false);
      setNewAgent({
        name: "",
        description: "",
        is_private: true,
      });
      setSelectedKnowledge([]);
      fetchAgents();
    } catch (error) {
      console.error("Error al guardar agente:", error);
      setError(
        error instanceof Error ? error.message : "Error al guardar agente"
      );
    } finally {
      setCreating(false);
    }
  };

  // Delete agent
  const handleDeleteAgent = async () => {
    if (!agentToDelete || !session?.user?.accessToken) return;

    try {
      setDeleting(true);

      const provider = session.user.provider || "github";
      const jwtToken = await knowledgeService.exchangeToken(
        session.user.accessToken,
        provider
      );

      await agentsService.deleteAgent(`Bearer ${jwtToken}`, agentToDelete.id);

      fetchAgents();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error eliminando agente:", error);
      setError(
        error instanceof Error ? error.message : "Error al eliminar el agente"
      );
    } finally {
      setDeleting(false);
    }
  };

  // Fetch agents from backend
  const fetchAgents = useCallback(async () => {
    if (!session?.user?.accessToken) {
      setLoading(false);
      setAgentsData([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = session.user.provider || "github";
      const jwtToken = await knowledgeService.exchangeToken(
        session.user.accessToken,
        provider
      );

      // Obtener todos los agentes
      const agents = await agentsService.getAllAgents(`Bearer ${jwtToken}`);

      // Asegurar que cada agente tenga todos los campos necesarios
      const processedAgents = agents.map(async (agent) => {
        const agentKnowledge = await agentsService.getAgentKnowledge(
          `Bearer ${jwtToken}`,
          agent.id
        );

        let knowledgeBaseName = "Ninguno";
        if (agentKnowledge && agentKnowledge.length > 0) {
          knowledgeBaseName = agentKnowledge[0].name || "Sin nombre";
        }

        // Asegurar que todos los campos están presentes y formateados correctamente
        return {
          id: agent.id,
          name: agent.name || "Sin nombre",
          description: agent.description || "",
          is_system_agent: !!agent.is_system_agent,
          created_at: agent.created_at || new Date().toISOString(),
          knowledge_base_name: knowledgeBaseName,
          // Otros campos que puedas necesitar
        };
      });

      const agentsWithKnowledge = await Promise.all(processedAgents);
      console.log("Agentes procesados:", agentsWithKnowledge);

      setAgentsData(agentsWithKnowledge);

      // Cargar bases de conocimiento (tanto del usuario como del sistema)
      const kbases = await knowledgeService.getKnowledgeBases(
        `Bearer ${jwtToken}`
      );
      setKnowledgeBases(
        kbases.filter((kb) => !kb.is_system_base || kb.is_system_base === false)
      );

      // Cargar knowledge items del usuario
      const profile = await knowledgeService.getUserProfile(
        `Bearer ${jwtToken}`
      );
      const userKnowledge = await knowledgeService.getUserKnowledge(
        `Bearer ${jwtToken}`,
        profile.id
      );
      setKnowledgeItems(userKnowledge);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.accessToken]);

  // Reemplazar la función handleEditAgent
  const handleEditAgent = useCallback(
    async (agent: Agent) => {
      console.log("Editando agente:", agent);
      setCurrentAgent(agent);
      setNewAgent({
        name: agent.name,
        description: agent.description || "",
        is_private: true,
      });

      // Limpiamos la selección actual antes de cargar la nueva
      setSelectedKnowledge([]);

      try {
        const provider = session?.user?.provider || "github";
        if (!session?.user?.accessToken) return;

        const jwtToken = await knowledgeService.exchangeToken(
          session.user.accessToken,
          provider
        );

        // Obtener los items de conocimiento asociados al agente
        console.log(
          `Obteniendo items de conocimiento para agente ID ${agent.id}...`
        );
        const agentKnowledgeItems = await agentsService.getAgentKnowledge(
          `Bearer ${jwtToken}`,
          agent.id
        );

        console.log("Items de conocimiento obtenidos:", agentKnowledgeItems);

        if (agentKnowledgeItems && agentKnowledgeItems.length > 0) {
          // Preparar los objetos completos de conocimiento
          const allAvailableKnowledge = [...knowledgeItems, ...knowledgeBases];
          const knowledgeToSelect = [];

          for (const item of agentKnowledgeItems) {
            const matchingItem = allAvailableKnowledge.find(
              (k) => k.id === item.id
            );
            if (matchingItem) {
              console.log(
                `Encontrado conocimiento con ID ${item.id}:`,
                matchingItem
              );
              knowledgeToSelect.push(matchingItem);
            } else {
              console.warn(
                `No se encontró el objeto completo para knowledge ID ${item.id}`
              );
            }
          }

          console.log(
            `Total de ${knowledgeToSelect.length} items seleccionados:`,
            knowledgeToSelect
          );
          setSelectedKnowledge(knowledgeToSelect);
        } else {
          console.log(
            "No se encontraron items de conocimiento para este agente"
          );
          setSelectedKnowledge([]);
        }
      } catch (error) {
        console.error("Error al cargar datos del agente:", error);
        setSelectedKnowledge([]);
      }

      setModalMode("edit");
      setModalOpen(true);
    },
    [knowledgeBases, knowledgeItems, session, agentsService, knowledgeService]
  );

  // Handle agent deletion confirmation
  const handleDeleteConfirmation = useCallback((agent: Agent) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  }, []);

  // Add/Open form for creating a new agent
  const handleAddAgent = useCallback(() => {
    setModalMode("create");
    setCurrentAgent(null);
    setNewAgent({
      name: "",
      description: "",
      knowledge_id: 0,
      is_private: true,
    });
    setSelectedKnowledge([]);
    setModalOpen(true);
  }, []);

  // Update the selected knowledge when knowledge bases or items change and we're editing
  useEffect(() => {
    if (currentAgent && modalMode === "edit") {
      const allKnowledgeOptions = [...knowledgeBases, ...knowledgeItems];
      const matchingKnowledge = allKnowledgeOptions.find(
        (k) => k.id === currentAgent.knowledge_id
      );

      if (matchingKnowledge) {
        console.log(
          "Updating selected knowledge after data fetch:",
          matchingKnowledge
        );
        setSelectedKnowledge([matchingKnowledge]);
      }
    }
  }, [currentAgent, knowledgeBases, knowledgeItems, modalMode]);

  // Set up event listeners
  useEffect(() => {
    const handleEdit = (event: CustomEvent) => handleEditAgent(event.detail);
    const handleDelete = (event: CustomEvent) =>
      handleDeleteConfirmation(event.detail);

    window.addEventListener("edit-agent", handleEdit as EventListener);
    window.addEventListener("delete-agent", handleDelete as EventListener);

    return () => {
      window.removeEventListener("edit-agent", handleEdit as EventListener);
      window.removeEventListener("delete-agent", handleDelete as EventListener);
    };
  }, [handleEditAgent, handleDeleteConfirmation]);

  // Load data on mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agentsData,
    loading,
    error,
    setError, // Asegúrate de incluir esto
    modalOpen,
    modalMode,
    setModalOpen,
    currentAgent,
    creating,
    newAgent,
    setNewAgent, // Export explicitly
    handleInputChange,
    handleSaveAgent,
    deleting,
    deleteDialogOpen,
    setDeleteDialogOpen,
    agentToDelete,
    handleDeleteAgent,
    knowledgeBases,
    knowledgeItems,
    selectedKnowledge,
    setSelectedKnowledge,
    handleAddAgent,
  };
}
