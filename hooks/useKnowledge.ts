// hooks/useKnowledge.ts
import { KnowledgeService } from "@/services/knowledge-service";
import { KnowledgeItem } from "@/types/sections";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

export function useKnowledge() {
  const { data: session } = useSession();
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentKnowledge, setCurrentKnowledge] =
    useState<KnowledgeItem | null>(null);
  const knowledgeService = KnowledgeService.getInstance();

  // Estados para modales
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [knowledgeToDelete, setKnowledgeToDelete] =
    useState<KnowledgeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Estados para formulario
  const [creating, setCreating] = useState(false);
  const [newKnowledge, setNewKnowledge] = useState({
    name: "",
    description: "",
    content: "",
    repository_id: "", // Agregar este campo
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewKnowledge((prev) => ({ ...prev, [name]: value }));
  };

  const fetchKnowledgeData = useCallback(async () => {
    if (!session?.user?.accessToken) {
      setLoading(false);
      setKnowledgeData([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const oauthToken = session.user.accessToken;
      const provider = session.user.provider || "github";
      const jwtToken = await knowledgeService.exchangeToken(
        oauthToken,
        provider
      );
      const profile = await knowledgeService.getUserProfile(
        `Bearer ${jwtToken}`
      );
      const userId = profile.id || "1";
      const data = await knowledgeService.getUserKnowledge(
        `Bearer ${jwtToken}`,
        userId
      );
      setKnowledgeData(data);
    } catch (err) {
      console.error("Error fetching knowledge data:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      const fallbackData = knowledgeService.getFallbackKnowledgeData("1");
      setKnowledgeData(fallbackData);
    } finally {
      setLoading(false);
    }
  }, [session, knowledgeService]);

  const saveKnowledge = async (
    content: string,
    jobId: string | null = null
  ) => {
    if (!session?.user?.accessToken) {
      setError("No hay sesión activa");
      return false;
    }

    try {
      setCreating(true);
      const provider = session.user.provider || "github";
      const jwtToken = await knowledgeService.exchangeToken(
        session.user.accessToken,
        provider
      );

      // Si tenemos un jobId de indexación, incluirlo en la creación
      const finalContent = jobId
        ? `${content}\nFile job_id: ${jobId}`
        : content;

      if (modalMode === "create") {
        await knowledgeService.createKnowledgeItem(
          `Bearer ${jwtToken}`,
          newKnowledge.name,
          newKnowledge.description,
          finalContent,
          newKnowledge.repository_id // Incluir repository_id aquí
        );
      } else {
        if (!currentKnowledge) return false;
        await knowledgeService.updateKnowledgeItem(
          `Bearer ${jwtToken}`,
          currentKnowledge.id,
          newKnowledge.name,
          newKnowledge.description,
          finalContent,
          newKnowledge.repository_id // Incluir repository_id aquí
        );
      }

      await fetchKnowledgeData();
      return true;
    } catch (error) {
      console.error("Error al guardar conocimiento:", error);
      setError(
        error instanceof Error ? error.message : "Error al guardar conocimiento"
      );
      return false;
    } finally {
      setCreating(false);
    }
  };

  const deleteKnowledge = async () => {
    if (!knowledgeToDelete || !session?.user?.accessToken) return false;

    try {
      setDeleting(true);
      const provider = session.user.provider || "github";
      const jwtToken = await knowledgeService.exchangeToken(
        session.user.accessToken,
        provider
      );

      await knowledgeService.deleteKnowledgeItem(
        `Bearer ${jwtToken}`,
        knowledgeToDelete.id
      );

      await fetchKnowledgeData();
      setDeleteDialogOpen(false);
      return true;
    } catch (error) {
      console.error("Error eliminando conocimiento:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Error al eliminar el conocimiento"
      );
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setCurrentKnowledge(null);
    setNewKnowledge({ name: "", description: "", content: "" });
    setModalOpen(true);
  };

  const openEditModal = (knowledge: KnowledgeItem) => {
    setCurrentKnowledge(knowledge);
    setNewKnowledge({
      name: knowledge.name,
      description: knowledge.description || "",
      content: knowledge.content || "",
    });
    setModalMode("edit");
    setModalOpen(true);
  };

  const openDeleteDialog = (knowledge: KnowledgeItem) => {
    setKnowledgeToDelete(knowledge);
    setDeleteDialogOpen(true);
  };

  // Event listeners for events fired from other components
  useEffect(() => {
    const handleEdit = (event: CustomEvent) => openEditModal(event.detail);
    const handleDelete = (event: CustomEvent) => openDeleteDialog(event.detail);

    window.addEventListener("edit-knowledge", handleEdit as EventListener);
    window.addEventListener("delete-knowledge", handleDelete as EventListener);

    return () => {
      window.removeEventListener("edit-knowledge", handleEdit as EventListener);
      window.removeEventListener(
        "delete-knowledge",
        handleDelete as EventListener
      );
    };
  }, []);

  useEffect(() => {
    fetchKnowledgeData();
  }, [session, fetchKnowledgeData]);

  return {
    // Datos y estado
    knowledgeData,
    loading,
    error,
    setError,
    currentKnowledge,

    // Estados de formulario
    newKnowledge,
    setNewKnowledge,
    creating,

    // Manipulación de modales
    modalOpen,
    setModalOpen,
    modalMode,
    deleteDialogOpen,
    setDeleteDialogOpen,
    knowledgeToDelete,
    deleting,

    // Acciones
    handleInputChange,
    fetchKnowledgeData,
    saveKnowledge,
    deleteKnowledge,
    openCreateModal,
    openEditModal,
    openDeleteDialog,
  };
}
