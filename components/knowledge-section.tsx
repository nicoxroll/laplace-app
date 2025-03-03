"use client";
import { DataTable } from "@/components/ui/data-table";
import { SectionCard } from "@/components/ui/section-card";
import { BookOpen, AlertCircle } from "lucide-react";
import { Typography, Chip, Box, CircularProgress, Alert } from "@mui/material";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { KnowledgeItem } from "@/types/sections";
import { KnowledgeService } from "@/services/knowledge-service";
import { error } from "console";
import { size } from "lodash";
import { icon } from "mermaid/dist/rendering-util/rendering-elements/shapes/icon.js";
import { title } from "process";
import zIndex from "@mui/material/styles/zIndex";

// Define column type
interface Column {
  id: string;
  label: string;
  renderCell: (row: KnowledgeItem) => React.ReactNode;
}

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
  const { data: session } = useSession();
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const knowledgeService = KnowledgeService.getInstance();

  useEffect(() => {
    async function fetchKnowledgeData() {
      if (!session?.user?.accessToken) {
        setLoading(false);
        setKnowledgeData([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Datos de prueba temporales mientras se soluciona el problema del API
        const demoData: KnowledgeItem[] = [
          {
            id: "1",
            name: "Reglas",
            description: "Documentos de normas",
            size: "540KB",
            type: "pdf",
            created_at: "2025-01-15",
            updated_at: "2025-02-20",
            user_id: "dev-user-1",
          },
          {
            id: "2",
            name: "Guía de arquitectura",
            description: "Principios de diseño y estándares",
            size: "1.2MB",
            type: "docx",
            created_at: "2025-01-10",
            updated_at: "2025-02-18",
            user_id: "dev-user-1",
          },
          {
            id: "3",
            name: "Manual de operaciones",
            description: "Procedimientos operativos estándar",
            size: "750KB",
            type: "md",
            created_at: "2025-02-05",
            updated_at: "2025-02-22",
            user_id: "dev-user-1",
          },
        ];

        setKnowledgeData(demoData);

        // Código comentado para intentar obtener los datos reales
        /* 
        const profile = await knowledgeService.getUserProfile(...);
        ... resto del código original ...
        */
      } catch (err) {
        // Manejo de error como antes
        console.error("Error fetching knowledge data:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
        setKnowledgeData([]); // Asegurar que siempre tenemos un array vacío al menos
      } finally {
        setLoading(false);
      }
    }

    fetchKnowledgeData();
  }, [session]);

  return (
    <SectionCard icon={BookOpen} title="Knowledge Base">
      {/* Si hay error, mostrar alerta pero mantener la tabla */}
      {error && (
        <Alert
          severity="error"
          icon={<AlertCircle size={20} />}
          sx={{ mt: 2, mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Siempre mostrar la tabla, incluso si está vacía o hay errores */}
      <Box sx={{ mt: 2, position: "relative" }}>
        {/* Overlay de carga si está cargando */}
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
          // El componente DataTable maneja automáticamente el caso de que no hay datos
          // mostrando un mensaje "No results found" en la tabla vacía
        />

        {/* Mensaje cuando no hay datos (solo mostrar si no está cargando y no hay error) */}
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
  );
}
