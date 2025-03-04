// components/knowledge/KnowledgeTable.tsx
import { DataTable } from "@/components/ui/data-table";
import { KnowledgeItem } from "@/types/sections";
import { Avatar, AvatarGroup, Box, CircularProgress, Tooltip, Typography, IconButton } from "@mui/material";
import { User, Edit, Trash } from "lucide-react";

interface KnowledgeTableProps {
  data: KnowledgeItem[];
  loading: boolean;
  onEdit?: (knowledge: KnowledgeItem) => void;
  onDelete?: (knowledge: KnowledgeItem) => void;
  onRowClick?: (knowledge: KnowledgeItem) => void;
}

export function KnowledgeTable({
  data = [],
  loading,
  onEdit,
  onDelete,
  onRowClick,
}: KnowledgeTableProps) {
  // Definir columnas
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
      id: "associated_agents",
      label: "Agentes",
      format: (value: string[], row: KnowledgeItem) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {value && value.length > 0 ? (
            <AvatarGroup 
              max={3}
              sx={{ 
                '& .MuiAvatar-root': {
                  width: 28, 
                  height: 28, 
                  fontSize: '0.75rem',
                  bgcolor: '#161b22',
                  border: '1px solid #30363d',
                  color: '#e6edf3'
                }
              }}
            >
              {value.map((agentName, index) => (
                <Tooltip key={index} title={agentName}>
                  <Avatar
                    sx={{ 
                      bgcolor: getColorFromString(agentName)
                    }}
                  >
                    {agentName.charAt(0).toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: '0.75rem' }}>
              Ninguno
            </Typography>
          )}
        </Box>
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
  
  // Función auxiliar para generar colores consistentes basados en strings
  function getColorFromString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#0969da', '#1a7f37', '#9e6a03', '#8250df', '#cf222e',
      '#116329', '#953800', '#57606a', '#6639ba', '#a475f9'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }

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
        rows={data}
        title="Conocimiento"
        onRowClick={onRowClick}
      />

      {!loading && data.length === 0 && (
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
