"use client";

import { DataTable } from "@/components/ui/data-table";
import { SectionCard } from "@/components/ui/section-card";
import { KnowledgeService } from "@/services/knowledge-service";
import { KnowledgeItem } from "@/types/sections";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  LinearProgress,
  TextField,
  Typography,
} from "@mui/material";
import {
  AlertCircle,
  BookOpen,
  Database,
  Edit,
  File,
  Plus,
  Trash,
  Upload,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

// Columnas correctas para la tabla
const columns = [
  {
    id: "name",
    label: "Nombre",
    format: (value: string) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    ),
  },
  {
    id: "description",
    label: "Descripción",
    format: (value: string) => (
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          maxWidth: 400,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value || "Sin descripción"}
      </Typography>
    ),
  },
  {
    id: "created_at",
    label: "Creado",
    format: (value: string) => (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {new Date(value).toLocaleDateString()}
      </Typography>
    ),
  },
  {
    id: "base_name",
    label: "Base",
    format: (value: string) => (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {value || "General"}
      </Typography>
    ),
  },
  {
    id: "actions",
    label: "Acciones",
    align: "right" as const,
    sortable: false,
    format: (value: any, row: KnowledgeItem) => (
      <Box sx={{ display: "flex", justifyContent: "flex-end", minWidth: 110 }}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("edit-knowledge", { detail: row })
            );
          }}
          sx={{ color: "primary.main", mr: 1 }}
        >
          <Edit size={18} />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("delete-knowledge", { detail: row })
            );
          }}
          sx={{ color: "error.main" }}
        >
          <Trash size={18} />
        </IconButton>
      </Box>
    ),
  },
];

function getTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "pdf":
      return "#e53935";
    case "docx":
      return "#1976d2";
    case "md":
      return "#7b1fa2";
    case "txt":
      return "#388e3c";
    default:
      return "#757575";
  }
}

export function KnowledgeSection() {
  const { data: session } = useSession();
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const knowledgeService = KnowledgeService.getInstance();

  // Estados para modales y acciones
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentKnowledge, setCurrentKnowledge] =
    useState<KnowledgeItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKnowledge, setNewKnowledge] = useState({
    name: "",
    description: "",
    content: "",
  });

  // Estados para carga de archivos e indexación
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isIndexed, setIsIndexed] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Otros estados existentes
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [knowledgeToDelete, setKnowledgeToDelete] =
    useState<KnowledgeItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [selectedKnowledge, setSelectedKnowledge] =
    useState<KnowledgeItem | null>(null);

  // Handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewKnowledge((prev) => ({ ...prev, [name]: value }));
  };

  // Función para manejar la selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setIsIndexed(false); // Reset indexing state when new file is selected

      // Actualizar el nombre automáticamente con el nombre del archivo
      setNewKnowledge((prev) => ({
        ...prev,
        name: file.name.split(".")[0], // Usar nombre del archivo como título
        description: `Documento subido: ${file.name} (${(
          file.size / 1024
        ).toFixed(2)} KB)`,
      }));
    }
  };

  // Función para iniciar la indexación
  const handleIndexFile = async () => {
    if (!selectedFile || !session?.user?.accessToken) return;

    try {
      setIsIndexing(true);
      setIndexProgress(0);
      setError(null);

      // Obtener token JWT para las llamadas a la API
      const provider = session.user.provider || "github";
      const jwtToken = await knowledgeService.exchangeToken(
        session.user.accessToken,
        provider
      );

      // Crear FormData para subir el archivo
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Llamar al endpoint de upload del backend
      const response = await fetch(
        `${knowledgeService.baseUrl}/api/knowledge/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en la carga: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("Respuesta de indexación:", data);

      // Guardar el job_id para consultar estado
      setJobId(data.job_id);

      // Iniciar polling para verificar estado
      startStatusPolling(jwtToken, data.job_id);
    } catch (error) {
      console.error("Error indexando archivo:", error);
      setError(
        error instanceof Error ? error.message : "Error indexando archivo"
      );
      setIsIndexing(false);
    }
  };

  // Función para consultar estado de la indexación
  const startStatusPolling = (token: string, jobId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `${knowledgeService.baseUrl}/api/knowledge/job/${jobId}/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error al verificar estado: ${response.status}`);
        }

        const statusData = await response.json();
        console.log("Estado de indexación:", statusData);

        // Actualizar el progreso
        if (statusData.progress) {
          setIndexProgress(statusData.progress * 100);
        }

        // Verificar si se completó
        if (statusData.status === "completed") {
          setIsIndexed(true);
          setIsIndexing(false);

          // Actualizar el contenido con metadata del archivo
          setNewKnowledge((prev) => ({
            ...prev,
            content: `${prev.content}\nArchivo indexado exitosamente. ID: ${jobId}`,
          }));

          return; // Terminar polling
        } else if (statusData.status === "failed") {
          throw new Error(statusData.message || "La indexación falló");
        }

        // Continuar polling
        setTimeout(checkStatus, 2000);
      } catch (error) {
        console.error("Error verificando estado:", error);
        setError(
          error instanceof Error ? error.message : "Error verificando estado"
        );
        setIsIndexing(false);
      }
    };

    // Iniciar el proceso de verificación
    checkStatus();
  };

  const handleSaveKnowledge = async () => {
    if (!session?.user?.accessToken) {
      setError("No hay sesión activa");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      setErrorDetails(null);

      const provider = session.user.provider || "github";
      const jwtToken = await knowledgeService.exchangeToken(
        session.user.accessToken,
        provider
      );

      // Si tenemos un jobId de indexación, incluirlo en la creación
      const content = jobId
        ? `${newKnowledge.content}\nFile job_id: ${jobId}`
        : newKnowledge.content;

      if (modalMode === "create") {
        await knowledgeService.createKnowledgeItem(
          `Bearer ${jwtToken}`,
          newKnowledge.name,
          newKnowledge.description,
          content
        );
      } else {
        if (!currentKnowledge) return;
        await knowledgeService.updateKnowledgeItem(
          `Bearer ${jwtToken}`,
          currentKnowledge.id,
          newKnowledge.name,
          newKnowledge.description,
          content
        );
      }

      setModalOpen(false);
      setNewKnowledge({ name: "", description: "", content: "" });
      setSelectedFile(null);
      setIsIndexed(false);
      setJobId(null);
      fetchKnowledgeData();
    } catch (error) {
      console.error("Error al guardar conocimiento:", error);
      setError(
        error instanceof Error ? error.message : "Error al guardar conocimiento"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKnowledge = async () => {
    if (!knowledgeToDelete || !session?.user?.accessToken) return;

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

      fetchKnowledgeData();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error eliminando conocimiento:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Error al eliminar el conocimiento"
      );
    } finally {
      setDeleting(false);
    }
  };

  const debugKnowledgeModel = async () => {
    if (!session?.user?.accessToken) return;

    try {
      const provider = session.user.provider || "github";
      const jwtToken = await knowledgeService.exchangeToken(
        session.user.accessToken,
        provider
      );

      const modelInfo = await knowledgeService.getKnowledgeModelInfo(
        `Bearer ${jwtToken}`
      );
      setDebugInfo(modelInfo);
      setErrorDetails(JSON.stringify(modelInfo, null, 2));
    } catch (err) {
      console.error("Error obteniendo información del modelo:", err);
      setError(err instanceof Error ? err.message : "Error en depuración");
    }
  };

  async function fetchKnowledgeData() {
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
  }

  // Event listeners
  useEffect(() => {
    const handleEdit = (event: CustomEvent) => {
      const knowledge = event.detail;
      setCurrentKnowledge(knowledge);
      setNewKnowledge({
        name: knowledge.name,
        description: knowledge.description || "",
        content: knowledge.content || "",
      });
      setModalMode("edit");
      setModalOpen(true);
    };

    const handleDelete = (event: CustomEvent) => {
      setKnowledgeToDelete(event.detail);
      setDeleteDialogOpen(true);
    };

    const handleRowClick = (event: CustomEvent) => {
      setSelectedKnowledge(event.detail);
    };

    window.addEventListener("edit-knowledge", handleEdit as EventListener);
    window.addEventListener("delete-knowledge", handleDelete as EventListener);
    window.addEventListener(
      "select-knowledge",
      handleRowClick as EventListener
    );

    return () => {
      window.removeEventListener("edit-knowledge", handleEdit as EventListener);
      window.removeEventListener(
        "delete-knowledge",
        handleDelete as EventListener
      );
      window.removeEventListener(
        "select-knowledge",
        handleRowClick as EventListener
      );
    };
  }, []);

  useEffect(() => {
    fetchKnowledgeData();
  }, [session]);

  return (
    <Box position="relative">
      <SectionCard
        icon={BookOpen}
        title="Knowledge Base"
        action={
          <Fab
            color="primary"
            size="medium"
            aria-label="add"
            onClick={() => {
              setModalMode("create");
              setCurrentKnowledge(null);
              setNewKnowledge({ name: "", description: "", content: "" });
              setModalOpen(true);
            }}
            sx={{ boxShadow: 2 }}
          >
            <Plus size={24} />
          </Fab>
        }
      >
        {error && (
          <Alert
            severity="error"
            icon={<AlertCircle size={20} />}
            sx={{ mt: 2, mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2, position: "relative" }}>
          {loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(13, 17, 23, 0.7)",
                zIndex: 1,
                borderRadius: 1,
              }}
            >
              <CircularProgress size={40} />
            </Box>
          )}

          <DataTable
            columns={columns}
            rows={knowledgeData}
            rowsPerPageOptions={[3, 5, 10]}
            title="Documentos de conocimiento"
            onRowClick={(row) => {
              setSelectedKnowledge(row);
              window.dispatchEvent(
                new CustomEvent("select-knowledge", { detail: row })
              );
            }}
          />

          {!loading && !error && knowledgeData.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", mt: 2 }}
            >
              No se encontraron documentos de conocimiento.
            </Typography>
          )}
        </Box>
      </SectionCard>

      {/* Modal de creación/edición */}
      <Dialog
        open={modalOpen}
        onClose={() => !creating && !isIndexing && setModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {modalMode === "create"
            ? "Crear nuevo conocimiento"
            : "Editar conocimiento"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Nombre"
            type="text"
            fullWidth
            variant="outlined"
            value={newKnowledge.name}
            onChange={handleInputChange}
            disabled={creating || isIndexing}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Descripción"
            type="text"
            fullWidth
            variant="outlined"
            value={newKnowledge.description}
            onChange={handleInputChange}
            disabled={creating || isIndexing}
            sx={{ mb: 2 }}
          />

          {/* Componente de carga de archivos */}
          {modalMode === "create" && (
            <Box
              sx={{
                mb: 2,
                mt: 1,
                border: "1px dashed grey",
                borderRadius: 1,
                p: 2,
              }}
            >
              <Typography variant="body2" sx={{ mb: 1 }}>
                Subir documento (PDF, Excel, Word, etc.)
              </Typography>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
                style={{ display: "none" }}
                onChange={handleFileChange}
                disabled={creating || isIndexing}
              />

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={creating || isIndexing}
                  startIcon={<Upload size={18} />}
                >
                  Seleccionar archivo
                </Button>

                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleIndexFile}
                  disabled={!selectedFile || isIndexing || isIndexed}
                  startIcon={
                    isIndexing ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Database size={18} />
                    )
                  }
                >
                  {isIndexing ? "Indexando..." : "Indexar"}
                </Button>
              </Box>

              {selectedFile && (
                <Box sx={{ mt: 1 }}>
                  <Chip
                    icon={<File size={16} />}
                    label={`${selectedFile.name} (${(
                      selectedFile.size / 1024
                    ).toFixed(2)} KB)`}
                    variant="outlined"
                    color={isIndexed ? "success" : "default"}
                  />
                </Box>
              )}

              {isIndexing && (
                <LinearProgress
                  variant="determinate"
                  value={indexProgress}
                  sx={{ mt: 1 }}
                />
              )}

              {isIndexed && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  Archivo indexado correctamente
                </Alert>
              )}
            </Box>
          )}

          <TextField
            margin="dense"
            name="content"
            label="Contenido"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={newKnowledge.content}
            onChange={handleInputChange}
            disabled={creating || isIndexing}
          />

          {errorDetails && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Detalles del error:</Typography>
              <Box
                sx={{
                  maxHeight: "200px",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  backgroundColor: "#f5f5f5",
                  p: 1,
                  borderRadius: 1,
                }}
              >
                {errorDetails}
              </Box>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setModalOpen(false)}
            disabled={creating || isIndexing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveKnowledge}
            variant="contained"
            disabled={
              creating || !newKnowledge.name || (selectedFile && !isIndexed) // Deshabilitar si hay archivo pero no está indexado
            }
            startIcon={creating ? <CircularProgress size={20} /> : null}
          >
            {creating
              ? "Guardando..."
              : modalMode === "create"
              ? "Crear"
              : "Actualizar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de confirmación para eliminar */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar "{knowledgeToDelete?.name}"?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteKnowledge}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : null}
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
