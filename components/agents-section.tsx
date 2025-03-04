"use client";

import { DataTable } from "@/components/ui/data-table";
import { SectionCard } from "@/components/ui/section-card";
import { Agent, useAgents } from "@/hooks/useAgents";
import {
  Alert,
  Autocomplete,
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
  TextField,
  Typography,
} from "@mui/material";
import { AlertCircle, Bot, Edit, Plus, Trash, X } from "lucide-react";
import { useEffect } from "react";
import { modalTheme } from "@/styles/modalTheme";
import zIndex from "@mui/material/styles/zIndex";
import { error } from "console";
import { size } from "lodash";
import { icon } from "mermaid/dist/rendering-util/rendering-elements/shapes/icon.js";
import { type } from "os";
import { format } from "path";
import { title } from "process";

// Actualización de getColumns con el nuevo estilo
const getColumns = () => [
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
    id: "knowledge_base_name",
    label: "Base de conocimiento",
    format: (value: string) => (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {value || "Ninguno"}
      </Typography>
    ),
  },
  {
    id: "is_system_agent",
    label: "Tipo",
    format: (value: boolean) => (
      <Typography
        variant="body2"
        sx={{
          color: value ? "info.main" : "success.main",
          fontWeight: 500,
        }}
      >
        {value ? "Sistema" : "Personalizado"}
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
    id: "actions",
    label: "Acciones",
    align: "right" as const,
    sortable: false,
    format: (_: any, row: Agent) => (
      <Box sx={{ display: "flex", justifyContent: "flex-end", minWidth: 110 }}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("edit-agent", { detail: row })
            );
          }}
          sx={{ color: "primary.main", mr: 1 }}
          disabled={row.is_system_agent}
        >
          <Edit size={18} />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("delete-agent", { detail: row })
            );
          }}
          sx={{ color: "error.main" }}
          disabled={row.is_system_agent}
        >
          <Trash size={18} />
        </IconButton>
      </Box>
    ),
  },
];

export function AgentsSection({ repository }: { repository: any }) {
  const {
    agentsData,
    loading,
    error,
    setError, // 👈 Añadir esta línea
    modalOpen,
    setModalOpen,
    modalMode,
    currentAgent,
    creating,
    newAgent,
    setNewAgent,
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
  } = useAgents(repository);

  const columns = getColumns();

  // Log state for debugging
  useEffect(() => {
    console.log("Current selectedKnowledge:", selectedKnowledge);
    console.log("Current newAgent:", newAgent);
  }, [selectedKnowledge, newAgent]);

  return (
    <Box position="relative">
      <SectionCard
        icon={Bot}
        title={repository ? `AI Agents - ${repository.full_name}` : "AI Agents"}
        action={
          <Fab
            color="primary"
            size="medium"
            aria-label="add"
            onClick={handleAddAgent}
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
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setError(null)}
              >
                <X size={18} />
              </IconButton>
            }
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
            rows={agentsData}
            rowsPerPageOptions={[5, 10, 25]}
            title="Agentes disponibles"
          />

          {!loading && !error && agentsData.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", mt: 2 }}
            >
              No se encontraron agentes.
            </Typography>
          )}
        </Box>
      </SectionCard>

      {/* Creation/Edit Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => !creating && setModalOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: modalTheme.paper,
            color: modalTheme.text.primary,
            border: `1px solid ${modalTheme.border}`,
            borderRadius: 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: `1px solid ${modalTheme.border}`,
            bgcolor: modalTheme.headerFooter,
          }}
        >
          {modalMode === "create" ? "Crear nuevo agente" : "Editar agente"}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: modalTheme.paper, pt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Nombre"
            type="text"
            fullWidth
            variant="outlined"
            value={newAgent.name}
            onChange={handleInputChange}
            disabled={creating}
            sx={{
              mb: 2,
              mt: 1,
              "& .MuiOutlinedInput-root": {
                color: modalTheme.text.primary,
                "& fieldset": {
                  borderColor: modalTheme.input.border,
                },
                "&:hover fieldset": {
                  borderColor: modalTheme.input.hoverBorder,
                },
                "&.Mui-focused fieldset": {
                  borderColor: modalTheme.input.focusBorder,
                },
              },
              "& .MuiInputLabel-root": {
                color: modalTheme.input.label,
                "&.Mui-focused": {
                  color: modalTheme.input.labelFocus,
                },
              },
            }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Descripción"
            type="text"
            fullWidth
            variant="outlined"
            value={newAgent.description}
            onChange={handleInputChange}
            disabled={creating}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                color: modalTheme.text.primary,
                "& fieldset": {
                  borderColor: modalTheme.input.border,
                },
                "&:hover fieldset": {
                  borderColor: modalTheme.input.hoverBorder,
                },
                "&.Mui-focused fieldset": {
                  borderColor: modalTheme.input.focusBorder,
                },
              },
              "& .MuiInputLabel-root": {
                color: modalTheme.input.label,
                "&.Mui-focused": {
                  color: modalTheme.input.labelFocus,
                },
              },
            }}
          />

          {/* Nuevo campo para API URL */}
          <TextField
            margin="dense"
            name="api_url"
            label="URL de API (opcional)"
            type="text"
            fullWidth
            variant="outlined"
            value={newAgent.api_url || ""}
            onChange={handleInputChange}
            disabled={creating}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                color: modalTheme.text.primary,
                "& fieldset": {
                  borderColor: modalTheme.input.border,
                },
                "&:hover fieldset": {
                  borderColor: modalTheme.input.hoverBorder,
                },
                "&.Mui-focused fieldset": {
                  borderColor: modalTheme.input.focusBorder,
                },
              },
              "& .MuiInputLabel-root": {
                color: modalTheme.input.label,
                "&.Mui-focused": {
                  color: modalTheme.input.labelFocus,
                },
              },
            }}
          />

          {/* Knowledge Base Autocomplete */}
          <Autocomplete
            multiple
            id="knowledge-select"
            options={[...knowledgeItems, ...knowledgeBases]}
            getOptionLabel={(option) => {
              // Asegurarse de que siempre haya un nombre para mostrar
              return option?.name || `Item ${option?.id || ""}`;
            }}
            value={selectedKnowledge}
            onChange={(_event, newValue) => {
              console.log("Selección de knowledge cambiada:", newValue);
              setSelectedKnowledge(newValue);
            }}
            isOptionEqualToValue={(option, value) => option?.id === value?.id}
            disabled={creating}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Conocimiento asociado (opcional)"
                placeholder="Seleccionar items de conocimiento"
                margin="dense"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: modalTheme.text.primary,
                    "& fieldset": {
                      borderColor: modalTheme.input.border,
                    },
                    "&:hover fieldset": {
                      borderColor: modalTheme.input.hoverBorder,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: modalTheme.input.focusBorder,
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: modalTheme.input.label,
                    "&.Mui-focused": {
                      color: modalTheme.input.labelFocus,
                    },
                  },
                }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const tagProps = getTagProps({ index });
                return (
                  <Chip
                    label={option.name || `Item ${option.id || index}`}
                    {...tagProps}
                    color={index === 0 ? "primary" : "default"}
                    size="small"
                    variant={index === 0 ? "filled" : "outlined"}
                    sx={{
                      backgroundColor:
                        index === 0 ? modalTheme.primary.main : "transparent",
                      color: index === 0 ? "#FFFFFF" : modalTheme.text.primary,
                      borderColor:
                        index === 0 ? "transparent" : modalTheme.border,
                    }}
                  />
                );
              })
            }
            sx={{ mb: 2 }}
            limitTags={3}
            filterSelectedOptions
          />
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            borderTop: `1px solid ${modalTheme.border}`,
            bgcolor: modalTheme.headerFooter,
          }}
        >
          <Button
            onClick={() => setModalOpen(false)}
            disabled={creating}
            sx={{
              color: modalTheme.text.secondary,
              "&:hover": {
                backgroundColor: modalTheme.background,
                color: modalTheme.text.primary,
              },
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveAgent}
            variant="contained"
            disabled={creating || !newAgent.name}
            startIcon={creating ? <CircularProgress size={20} /> : null}
            sx={{
              bgcolor: modalTheme.success.main,
              color: "#ffffff",
              "&:hover": {
                bgcolor: modalTheme.success.hover,
              },
              "&.Mui-disabled": {
                bgcolor: modalTheme.background,
                color: modalTheme.text.secondary,
              },
            }}
          >
            {creating
              ? "Guardando..."
              : modalMode === "create"
              ? "Crear"
              : "Actualizar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: modalTheme.paper,
            color: modalTheme.text.primary,
            border: `1px solid ${modalTheme.border}`,
            borderRadius: 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: `1px solid ${modalTheme.border}`,
            bgcolor: modalTheme.headerFooter,
          }}
        >
          Confirmar eliminación
        </DialogTitle>
        <DialogContent sx={{ bgcolor: modalTheme.paper, pt: 2, mt: 1 }}>
          <Typography color={modalTheme.text.primary}>
            ¿Estás seguro de que deseas eliminar el agente "
            {agentToDelete?.name}"? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            borderTop: `1px solid ${modalTheme.border}`,
            bgcolor: modalTheme.headerFooter,
          }}
        >
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{
              color: modalTheme.text.secondary,
              "&:hover": {
                backgroundColor: modalTheme.background,
                color: modalTheme.text.primary,
              },
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteAgent}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : null}
            sx={{
              bgcolor: modalTheme.error.main,
              color: "#ffffff",
              "&:hover": {
                bgcolor: "error.dark",
              },
              "&.Mui-disabled": {
                bgcolor: modalTheme.background,
                color: modalTheme.text.secondary,
              },
            }}
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
