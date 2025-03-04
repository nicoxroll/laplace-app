// components/knowledge/KnowledgeForm.tsx
import { Repository, useRepositories } from "@/hooks/useRepositories";
import { modalTheme } from "@/styles/modalTheme";
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
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
} from "@mui/material";
import { File, Trash, Upload } from "lucide-react";
import { useEffect } from "react";

interface FileProps {
  selectedFile: File | null;
  isIndexed: boolean;
  indexProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleClearFile: () => void;
}

interface KnowledgeFormProps {
  open: boolean;
  mode: "create" | "edit";
  knowledge: {
    name: string;
    description: string;
    content: string;
    repository_id?: number | string;
  };
  onClose: () => void;
  onSave: () => Promise<void>;
  onChange: (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent
  ) => void;
  creating: boolean;
  isIndexing: boolean;
  fileProps: FileProps;
  error: string | null;
}

export function KnowledgeForm({
  open,
  mode,
  knowledge,
  onClose,
  onSave,
  onChange,
  creating,
  isIndexing,
  fileProps,
  error,
}: KnowledgeFormProps) {
  const {
    selectedFile,
    isIndexed,
    indexProgress,
    fileInputRef,
    handleFileChange,
    handleClearFile,
  } = fileProps;

  // Usar el hook para cargar los repositorios
  const { repositories, loadingRepos, fetchRepositories } = useRepositories();

  // Actualizar los repositorios cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      fetchRepositories();
    }
  }, [open, fetchRepositories]);

  const isSubmitDisabled =
    creating || isIndexing || !knowledge.name || (selectedFile && !isIndexed);

  const buttonText =
    creating || isIndexing
      ? selectedFile && !isIndexed
        ? "Indexando..."
        : "Guardando..."
      : mode === "create"
      ? "Crear"
      : "Actualizar";

  const handleRepositoryChange = (event: SelectChangeEvent) => {
    const customEvent = {
      target: {
        name: "repository_id",
        value: event.target.value,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(customEvent);
  };

  return (
    <Dialog
      open={open}
      onClose={!creating && !isIndexing ? onClose : undefined}
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
        {mode === "create" ? "Crear nuevo conocimiento" : "Editar conocimiento"}
      </DialogTitle>
      <DialogContent sx={{ bgcolor: modalTheme.paper, pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}

        <TextField
          autoFocus
          margin="dense"
          name="name"
          label="Nombre"
          type="text"
          fullWidth
          variant="outlined"
          value={knowledge.name}
          onChange={onChange}
          disabled={creating || isIndexing}
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
          value={knowledge.description}
          onChange={onChange}
          disabled={creating || isIndexing}
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

        {/* Selector de repositorio */}
        <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
          <InputLabel
            id="repository-select-label"
            sx={{ color: modalTheme.input.label }}
          >
            Repositorio
          </InputLabel>
          <Select
            labelId="repository-select-label"
            id="repository-select"
            name="repository_id"
            value={
              knowledge.repository_id ? String(knowledge.repository_id) : ""
            }
            label="Repositorio"
            onChange={handleRepositoryChange}
            disabled={creating || isIndexing || loadingRepos}
            sx={{
              color: modalTheme.text.primary,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: modalTheme.input.border,
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: modalTheme.input.hoverBorder,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: modalTheme.input.focusBorder,
              },
              "& .MuiSvgIcon-root": {
                color: modalTheme.text.secondary,
              },
            }}
          >
            {loadingRepos ? (
              <MenuItem disabled value="">
                <CircularProgress size={20} sx={{ mr: 1 }} /> Cargando
                repositorios...
              </MenuItem>
            ) : (
              <>
                <MenuItem value="">Seleccionar repositorio</MenuItem>
                {repositories.map((repo: Repository) => (
                  <MenuItem key={repo.id} value={repo.id.toString()}>
                    {repo.name}
                  </MenuItem>
                ))}
              </>
            )}
          </Select>
          <FormHelperText sx={{ color: modalTheme.text.secondary }}>
            Selecciona el repositorio donde se almacenará este conocimiento
          </FormHelperText>
        </FormControl>

        {mode === "create" && (
          <Box
            sx={{
              mb: 2,
              mt: 1,
              border: `1px dashed ${modalTheme.border}`,
              borderRadius: 1,
              p: 2,
              bgcolor: modalTheme.background,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
              style={{ display: "none" }}
              onChange={handleFileChange}
              disabled={creating || isIndexing}
            />

            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                disabled={creating || isIndexing}
                startIcon={<Upload size={18} />}
                sx={{
                  color: modalTheme.primary.main,
                  borderColor: modalTheme.primary.main,
                  "&:hover": {
                    backgroundColor: modalTheme.primary.hover,
                    borderColor: modalTheme.primary.main,
                  },
                }}
              >
                Seleccionar archivo
              </Button>
            </Box>

            {selectedFile && (
              <Box
                sx={{
                  mt: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Chip
                  icon={<File size={16} />}
                  label={`${selectedFile.name} (${(
                    selectedFile.size / 1024
                  ).toFixed(2)} KB)`}
                  variant="outlined"
                  color={isIndexed ? "success" : "default"}
                  sx={{
                    color: modalTheme.text.primary,
                    borderColor: isIndexed ? "success.main" : modalTheme.border,
                  }}
                />
                <IconButton
                  size="small"
                  onClick={handleClearFile}
                  sx={{ ml: 1 }}
                  color="error"
                >
                  <Trash size={16} />
                </IconButton>
              </Box>
            )}

            {isIndexing && (
              <LinearProgress
                variant="determinate"
                value={indexProgress}
                sx={{
                  mt: 1,
                  bgcolor: modalTheme.border,
                  "& .MuiLinearProgress-bar": {
                    bgcolor: modalTheme.primary.main,
                  },
                }}
              />
            )}

            {isIndexed && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Archivo indexado correctamente
              </Alert>
            )}
          </Box>
        )}

        {/* Content field removed as requested */}
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          borderTop: `1px solid ${modalTheme.border}`,
          bgcolor: modalTheme.headerFooter,
        }}
      >
        <Button
          onClick={onClose}
          disabled={creating || isIndexing}
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
          onClick={onSave}
          variant="contained"
          disabled={isSubmitDisabled}
          startIcon={
            creating || isIndexing ? <CircularProgress size={20} /> : null
          }
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
          {buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
