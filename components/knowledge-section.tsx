"use client";

import { SectionCard } from "@/components/ui/section-card";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useKnowledge } from "@/hooks/useKnowledge";
import { Alert, Box, Fab, IconButton, Select, MenuItem } from "@mui/material";
import { AlertCircle, BookOpen, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { DeleteConfirmDialog } from "./knowledge/DeleteConfirmDialog";
import { KnowledgeForm } from "./knowledge/KnowledgeForm";
import { KnowledgeTable } from "./knowledge/KnowledgeTable";
import { useSession } from "next-auth/react";
import { RepositoryService, fetchRepositories } from "@/services/repository-service";
import { Repository } from "@/types/repository";

export function KnowledgeSection() {
  // Estados y lógica principal desde hooks personalizados
  const {
    knowledgeData,
    loading: knowledgeLoading,
    error: knowledgeError,
    setError: setKnowledgeError,
    modalOpen,
    setModalOpen,
    modalMode,
    deleteDialogOpen,
    setDeleteDialogOpen,
    knowledgeToDelete,
    deleting,
    creating,
    newKnowledge,
    handleInputChange,
    saveKnowledge,
    deleteKnowledge,
    openCreateModal,
  } = useKnowledge();

  const {
    selectedFile,
    isIndexing,
    isIndexed,
    indexProgress,
    jobId,
    fileInputRef,
    handleFileChange,
    handleClearFile,
    uploadAndIndexFile,
  } = useFileUpload(setKnowledgeError);

  // Estado local para mostrar errores específicos del formulario
  const [formError, setFormError] = useState<string | null>(null);

  // Estados para repositorios
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  // Cargar repositorios al iniciar
  useEffect(() => {
    async function fetchRepos() {
      if (!session) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const repos = await fetchRepositories(session);
        setRepositories(repos);
      } catch (err) {
        console.error("Error fetching repositories:", err);
        setError(err instanceof Error ? err.message : "Error cargando repositorios");
      } finally {
        setLoading(false);
      }
    }

    fetchRepos();
  }, [session]);

  // Función combinada para guardar (primero indexa si hay archivo, luego guarda)
  const handleSave = async () => {
    try {
      // 1. Si hay un archivo y no está indexado, indexarlo
      let finalJobId = jobId;
      if (selectedFile && !isIndexed) {
        const result = await uploadAndIndexFile();
        if (!result.success) {
          return; // No continuar si falló la indexación
        }
        finalJobId = result.jobId;
      }

      // 2. Guardar conocimiento
      const saved = await saveKnowledge(newKnowledge.content, finalJobId);
      if (saved) {
        // 3. Limpiar estados
        setModalOpen(false);
        handleClearFile();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error en el proceso");
    }
  };

  return (
    <Box position="relative">
      {/* Sección principal con título y botón de acción */}
      <SectionCard
        icon={BookOpen}
        title="Knowledge Base"
        action={
          <Fab
            color="primary"
            size="medium"
            aria-label="add"
            onClick={openCreateModal}
            sx={{ boxShadow: 2 }}
          >
            <Plus size={24} />
          </Fab>
        }
      >
        {/* Mostrar error si existe */}
        {knowledgeError && (
          <Alert
            severity="error"
            icon={<AlertCircle size={20} />}
            sx={{ mt: 2, mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setKnowledgeError(null)}
              >
                <X size={18} />
              </IconButton>
            }
          >
            {knowledgeError}
          </Alert>
        )}

        {/* Tabla de conocimientos */}
        <Box sx={{ mt: 2 }}>
          <KnowledgeTable
            data={knowledgeData}
            loading={knowledgeLoading}
            onEdit={(knowledge) => {
              setModalOpen(true);
              // La lógica de edición se maneja en useKnowledge
            }}
            onDelete={(knowledge) => setDeleteDialogOpen(true)}
          />
        </Box>
      </SectionCard>

      {/* Formulario de creación/edición */}
      <KnowledgeForm
        open={modalOpen}
        mode={modalMode}
        knowledge={newKnowledge} // Ahora incluye repository_id
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onChange={handleInputChange}
        creating={creating}
        isIndexing={isIndexing}
        fileProps={{
          selectedFile,
          isIndexed,
          indexProgress,
          fileInputRef,
          handleFileChange,
          handleClearFile,
        }}
        error={formError}
      >
        {/* Para el select de repositorios: */}
        <Select
          label="Repositorio"
          name="repository_id"
          value={newKnowledge.repository_id || ""}
          onChange={handleInputChange}
          disabled={loading}
        >
          <MenuItem value="">Ninguno</MenuItem>
          {repositories.map((repo) => (
            <MenuItem key={`${repo.provider}-${repo.id}`} value={repo.id}>
              {repo.provider === "github" ? "GitHub: " : "GitLab: "}
              {repo.full_name}
            </MenuItem>
          ))}
        </Select>
      </KnowledgeForm>

      {/* Diálogo de confirmación de eliminación */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deleteKnowledge}
        knowledge={knowledgeToDelete}
        deleting={deleting}
      />
    </Box>
  );
}
