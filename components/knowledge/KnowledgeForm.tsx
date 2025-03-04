// components/knowledge/KnowledgeForm.tsx
import { Repository, useRepositories } from "@/hooks/useRepositories";
import { modalTheme } from "@/styles/modalTheme";
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
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import { File, Trash, Upload, X, FileWarning } from "lucide-react";
import { useEffect, useState } from "react";

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
  onError: (error: string | null) => void;
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
  onError,
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
  
  // Estado para controlar la selección exclusiva
  const [selectionMode, setSelectionMode] = useState<"repository" | "file" | null>(
    knowledge.repository_id ? "repository" : (selectedFile ? "file" : null)
  );

  // Actualizar los repositorios cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      fetchRepositories();
    }
  }, [open, fetchRepositories]);
  
  // Actualizar el modo de selección cuando cambian los props
  useEffect(() => {
    if (knowledge.repository_id) {
      setSelectionMode("repository");
    } else if (selectedFile) {
      setSelectionMode("file");
    } else {
      setSelectionMode(null);
    }
  }, [knowledge.repository_id, selectedFile]);

  // Manejador de cambio de repositorio con Autocomplete
  const handleRepositoryChange = (event: any, newValue: Repository | null) => {
    // Si seleccionamos un repositorio, limpiar el archivo si hay uno
    if (newValue && selectedFile) {
      handleClearFile();
    }
    
    // Actualizar el modo de selección
    setSelectionMode(newValue ? "repository" : null);
    
    // Crear un evento sintético para el onChange
    const customEvent = {
      target: {
        name: "repository_id",
        value: newValue ? newValue.id : "",
      },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(customEvent);
  };
  
  // Manejador personalizado para selección de archivo
  const handleFileChangeWithMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Si hay un archivo seleccionado, limpiar la selección de repositorio
    if (e.target.files && e.target.files.length > 0 && knowledge.repository_id) {
      const customEvent = {
        target: {
          name: "repository_id",
          value: "",
        },
      } as React.ChangeEvent<HTMLInputElement>;
      
      onChange(customEvent);
    }
    
    // Actualizar el modo de selección
    setSelectionMode("file");
    
    // Llamar al manejador original
    handleFileChange(e);
  };
  
  // Función para limpiar archivo manteniendo el modo
  const handleClearFileWithMode = () => {
    handleClearFile();
    setSelectionMode(null);
  };

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
          <Alert
            severity="error"
            sx={{ mb: 2, mt: 1 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => onError(null)}
              >
                <X size={18} />
              </IconButton>
            }
          >
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

        {/* Opciones de origen: Repositorio o Archivo */}
        <Typography variant="subtitle2" color={modalTheme.text.secondary} sx={{ mb: 1 }}>
          Origen del conocimiento (selecciona una opción):
        </Typography>

        {/* Autocomplete para repositorios */}
        <Autocomplete
          id="repository-autocomplete"
          options={repositories}
          loading={loadingRepos}
          disabled={creating || isIndexing || selectionMode === "file"}
          getOptionLabel={(option) => 
            `${option.provider === "github" ? "GitHub: " : "GitLab: "} ${option.full_name}`
          }
          value={knowledge.repository_id ? 
            repositories.find(r => r.id.toString() === knowledge.repository_id?.toString()) || null :
            null
          }
          onChange={handleRepositoryChange}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Seleccionar repositorio"
              margin="dense"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingRepos ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
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
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <Box component="span" sx={{ 
                mr: 1, 
                color: option.provider === "github" ? "#6e5494" : "#fc6d26" 
              }}>
                {option.provider === "github" ? "GitHub:" : "GitLab:"}
              </Box>
              {option.full_name}
            </li>
          )}
        />

        {/* Divisor con "o" */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          my: 2, 
          opacity: creating || isIndexing ? 0.5 : 1 
        }}>
          <Box sx={{ flex: 1, height: '1px', bgcolor: modalTheme.border }} />
          <Typography variant="body2" color={modalTheme.text.secondary} sx={{ mx: 2 }}>
            o
          </Typography>
          <Box sx={{ flex: 1, height: '1px', bgcolor: modalTheme.border }} />
        </Box>

        {/* Sección de carga de archivos */}
        <Box
          sx={{
            mb: 2,
            mt: 1,
            border: `1px dashed ${modalTheme.border}`,
            borderRadius: 1,
            p: 2,
            bgcolor: modalTheme.background,
            opacity: selectionMode === "repository" ? 0.5 : 1,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
            style={{ display: "none" }}
            onChange={handleFileChangeWithMode}
            disabled={creating || isIndexing || selectionMode === "repository"}
          />

          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              disabled={creating || isIndexing || selectionMode === "repository"}
              startIcon={<Upload size={18} />}
              sx={{
                color: modalTheme.primary.main,
                borderColor: modalTheme.primary.main,
                "&:hover": {
                  backgroundColor: modalTheme.primary.hover,
                  borderColor: modalTheme.primary.main,
                },
                "&.Mui-disabled": {
                  opacity: 0.5,
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
                onClick={handleClearFileWithMode}
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
