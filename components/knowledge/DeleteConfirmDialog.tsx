// components/knowledge/DeleteConfirmDialog.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import { KnowledgeItem } from "@/types/sections";

interface DeleteConfirmDialogProps {
  open: boolean;
  knowledge: KnowledgeItem | null;
  deleting: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export function DeleteConfirmDialog({
  open,
  knowledge,
  deleting,
  onClose,
  onDelete,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={() => !deleting && onClose()}>
      <DialogTitle>Confirmar eliminación</DialogTitle>
      <DialogContent>
        <Typography>
          ¿Estás seguro de que deseas eliminar "{knowledge?.name}"? Esta acción
          no se puede deshacer.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          Cancelar
        </Button>
        <Button
          onClick={onDelete}
          color="error"
          variant="contained"
          disabled={deleting}
          startIcon={deleting ? <CircularProgress size={20} /> : null}
        >
          {deleting ? "Eliminando..." : "Eliminar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
