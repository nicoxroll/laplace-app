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
  TextField,
  Typography,
} from "@mui/material";
import { AlertCircle, BookOpen, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

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

  // Estado para el modal de crear conocimiento
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKnowledge, setNewKnowledge] = useState({
    name: "",
    description: "",
    content: "",
  });

  // Añadir estos estados
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Función para manejar los cambios en los campos del formulario
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewKnowledge((prev) => ({ ...prev, [name]: value }));
  };

  // Función para crear nuevo conocimiento
  const handleCreateKnowledge = async () => {
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

      // Usar el método del servicio que ahora tiene el formato correcto
      await knowledgeService.createKnowledgeItem(
        `Bearer ${jwtToken}`,
        newKnowledge.name,
        newKnowledge.description,
        newKnowledge.content
      );

      // Si llegamos aquí, fue exitoso
      setModalOpen(false);
      setNewKnowledge({ name: "", description: "", content: "" });
      fetchKnowledgeData();
    } catch (error) {
      console.error("Error completo:", error);
      setError(
        error instanceof Error ? error.message : "Error al crear conocimiento"
      );
    } finally {
      setCreating(false);
    }
  };

  // Añadir función para depurar el modelo
  const debugKnowledgeModel = async () => {
    if (!session?.user?.accessToken) {
      setError("No hay sesión activa");
      return;
    }

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
      console.log("Información del modelo Knowledge:", modelInfo);

      // Mostrar información en el modal
      setErrorDetails(JSON.stringify(modelInfo, null, 2));
    } catch (err) {
      console.error("Error obteniendo información del modelo:", err);
      setError(err instanceof Error ? err.message : "Error en depuración");
    }
  };

  // Función existente para obtener datos modificada para ser reutilizable
  async function fetchKnowledgeData() {
    if (!session?.user?.accessToken) {
      setLoading(false);
      setKnowledgeData([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Resto del código existente...
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

  // useEffect existente...
  useEffect(() => {
    fetchKnowledgeData();
  }, [session]);

  useEffect(() => {
    // Verificar que el token está presente
    console.log("¿Hay token?", !!session?.user?.accessToken);
    console.log("Token:", session?.user?.accessToken?.substring(0, 15) + "...");

    // Probar con Fetch directamente
    if (session?.user?.accessToken) {
      const token = session.user.accessToken;
      fetch("http://localhost:8000/users/profile", {
        headers: {
          Authorization: token.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`,
        },
      })
        .then((res) => {
          console.log("Status de profile:", res.status);
          if (!res.ok) return res.text();
          return res.json();
        })
        .then((data) => console.log("Datos:", data))
        .catch((err) => console.error("Error fetch:", err));
    }
  }, [session]);

  return (
    <SectionCard icon={BookOpen} title="Knowledge Base">
      {/* Botón para añadir nuevo conocimiento */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setModalOpen(true)}
        >
          Agregar conocimiento
        </Button>
      </Box>

      {/* Modal para crear nuevo conocimiento */}
      <Dialog
        open={modalOpen}
        onClose={() => !creating && setModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Crear nuevo conocimiento</DialogTitle>
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
            disabled={creating}
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
            disabled={creating}
            sx={{ mb: 2 }}
          />
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
            disabled={creating}
          />

          {/* Sección de información de depuración */}
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
          <Button onClick={() => setModalOpen(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button
            onClick={debugKnowledgeModel}
            color="info"
            disabled={creating}
          >
            Debug
          </Button>
          <Button
            onClick={handleCreateKnowledge}
            variant="contained"
            disabled={creating || !newKnowledge.name}
            startIcon={creating ? <CircularProgress size={20} /> : null}
          >
            {creating ? "Creando..." : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

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
