"use client";
import { DataTable } from "@/components/ui/data-table";
import { SectionCard } from "@/components/ui/section-card";
import { BookOpen } from "lucide-react";
import { Typography, Chip, Box } from "@mui/material";
import { size } from "lodash";
import { icon } from "mermaid/dist/rendering-util/rendering-elements/shapes/icon.js";
import { title } from "process";

// Define proper types for the knowledge item
interface KnowledgeItem {
  id: string;
  name: string;
  description: string;
  size: string;
  type: string;
  created_at: string;
  updated_at: string;
}

// Define column type
interface Column {
  id: string;
  label: string;
  renderCell: (row: KnowledgeItem) => React.ReactNode;
}

// Datos de ejemplo para la tabla de conocimiento
const knowledgeData: KnowledgeItem[] = [
  {
    id: "1",
    name: "Reglas",
    description: "Documentos de normas",
    size: "540KB",
    type: "pdf",
    created_at: "2025-01-15",
    updated_at: "2025-02-20",
  },
  {
    id: "2",
    name: "Guía de arquitectura",
    description: "Principios de diseño y estándares",
    size: "1.2MB",
    type: "docx",
    created_at: "2025-01-10",
    updated_at: "2025-02-18",
  },
  {
    id: "3",
    name: "Manual de operaciones",
    description: "Procedimientos operativos estándar",
    size: "750KB",
    type: "md",
    created_at: "2025-02-05",
    updated_at: "2025-02-22",
  },
];

// Columnas para la tabla
const columns: Column[] = [
  {
    id: "name",
    label: "Nombre",
    renderCell: (row: KnowledgeItem) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {row.name}
      </Typography>
    ),
  },
  {
    id: "description",
    label: "Descripción",
    renderCell: (row: KnowledgeItem) => (
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
        {row.description}
      </Typography>
    ),
  },
  {
    id: "size",
    label: "Tamaño",
    renderCell: (row: KnowledgeItem) => (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {row.size}
      </Typography>
    ),
  },
  {
    id: "type",
    label: "Tipo",
    renderCell: (row: KnowledgeItem) => (
      <Chip
        label={row.type.toUpperCase()}
        size="small"
        sx={{
          bgcolor: getTypeColor(row.type),
          color: "#fff",
          fontWeight: 500,
          fontSize: "0.75rem",
        }}
      />
    ),
  },
];

// Función para determinar el color basado en el tipo de archivo
function getTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "pdf":
      return "#e53935"; // rojo
    case "docx":
      return "#1976d2"; // azul
    case "md":
      return "#7b1fa2"; // púrpura
    case "txt":
      return "#388e3c"; // verde
    default:
      return "#757575"; // gris
  }
}

export function KnowledgeSection() {
  return (
    <SectionCard icon={BookOpen} title="Knowledge Base">
      <Box sx={{ mt: 2 }}>
        <DataTable
          columns={columns}
          rows={knowledgeData}
          rowsPerPageOptions={[3, 5, 10]}
        />
      </Box>
    </SectionCard>
  );
}
