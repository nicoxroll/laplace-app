// components/knowledge/KnowledgeTable.tsx
import { DataTable } from "@/components/ui/data-table";
import { KnowledgeItem } from "@/types/sections";
import { Box, CircularProgress, IconButton, Typography } from "@mui/material";
import { Edit, Trash } from "lucide-react"; // Add this import for the icon components

// Columnas para la tabla definidas fuera del componente para evitar renders innecesarios
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

interface KnowledgeTableProps {
  data: KnowledgeItem[] | undefined; // Permitir undefined
  loading: boolean;
  onEdit?: (knowledge: KnowledgeItem) => void;
  onDelete?: (knowledge: KnowledgeItem) => void;
  onRowClick?: (knowledge: KnowledgeItem) => void;
}

export function KnowledgeTable({
  data = [], // Proporcionar un array vacío como valor predeterminado
  loading,
  onEdit,
  onDelete,
  onRowClick,
}: KnowledgeTableProps) {
  const knowledgeData = data || []; // Asegurar que siempre sea un array

  const columns = getColumns();

  const handleRowClick = (row: KnowledgeItem) => {
    if (onRowClick) {
      onRowClick(row);
    }
    window.dispatchEvent(new CustomEvent("select-knowledge", { detail: row }));
  };

  return (
    <Box sx={{ position: "relative" }}>
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
        rows={knowledgeData} // Usar la variable asegurada
        rowsPerPageOptions={[3, 5, 10]}
        title="Documentos de conocimiento"
        onRowClick={handleRowClick}
      />

      {!loading && knowledgeData.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", mt: 2 }}
        >
          No se encontraron documentos de conocimiento.
        </Typography>
      )}
    </Box>
  );
}
