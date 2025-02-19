"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import ReactFlow, { Background, Controls, MiniMap, Panel } from "reactflow";
import "reactflow/dist/style.css";

interface RepoItem {
  name: string;
  type: "file" | "dir" | "image";
  path: string;
}

interface FlowSidebarProps {
  apiUrl: string;
  repoData: {
    repoStructure: RepoItem[];
    selectedRepo: string | null;
  };
}

interface FlowNode {
  id: string;
  data: {
    label: string;
    type?: "security" | "input" | "output" | "default";
  };
  position: { x: number; y: number };
}

interface ApiResponse {
  nodes: FlowNode[];
  edges: { id: string; source: string; target: string }[];
}

const CODE_EXTENSIONS = new Set(['js', 'py', 'jsx', 'tsx', 'ts', 'html', 'css', 'json', 'java', 'cpp', 'cs']);

export default function FlowSidebar({ apiUrl, repoData }: FlowSidebarProps) {
  const [flowData, setFlowData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasFetched, setHasFetched] = useState(false);

  const getNodeColor = useCallback((node: FlowNode) => {
    const colors = {
      security: "#ef4444",
      input: "#3b82f6",
      output: "#10b981",
      default: "#3b82f6"
    };
    return colors[node.data.type || 'default'];
  }, []);

  const autoLayout = useCallback((nodes: FlowNode[]) => {
    const NODE_WIDTH = 250;
    const NODE_HEIGHT = 100;
    const MARGIN = 40;
    
    return nodes.map((node, index) => ({
      ...node,
      position: {
        x: MARGIN + (index % 2) * 300, // Layout en columnas
        y: MARGIN + Math.floor(index / 2) * (NODE_HEIGHT + MARGIN)
      },
      style: {
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        backgroundColor: getNodeColor(node),
        border: "2px solid #30363d",
        borderRadius: "8px",
        padding: "16px",
        fontSize: "0.875rem",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        color: "#ffffff",
      }
    }));
  }, [getNodeColor]);

  const filterCodeFiles = useCallback((files: RepoItem[]) => {
    return files.filter(file => {
      if (file.type !== 'file') return false;
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension && CODE_EXTENSIONS.has(extension);
    });
  }, []);

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setFlowData(null);

      const filteredCodeFiles = filterCodeFiles(repoData.repoStructure);
      if (filteredCodeFiles.length === 0) {
        throw new Error("No se encontraron archivos de código válidos");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000000);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: ""
            },
            {
              role: "user",
              content: JSON.stringify(filteredCodeFiles.map(f => f.path))
            }
          ],
          model: "deepseek-r1-distill-qwen-7b",
          temperature: 0.3
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

      const data = await response.json();
      const rawContent = data.choices[0].message.content;
      const parsedData: ApiResponse = JSON.parse(rawContent);

      if (!parsedData?.nodes?.length) throw new Error("Estructura de datos inválida");

      setFlowData({
        nodes: autoLayout(parsedData.nodes),
        edges: parsedData.edges || []
      });
      setHasFetched(true);

    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl, autoLayout, filterCodeFiles, repoData.repoStructure]);

  useEffect(() => {
    if (repoData.selectedRepo && !hasFetched && repoData.repoStructure.length > 0) {
      const timer = setTimeout(fetchAnalysis, 300);
      return () => clearTimeout(timer);
    }
  }, [repoData.selectedRepo, repoData.repoStructure, hasFetched, fetchAnalysis]);

  useEffect(() => {
    setHasFetched(false);
    setFlowData(null);
  }, [repoData.selectedRepo]);

  if (loading) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
          <ShieldAlert className="h-6 w-6" />
          Construyendo flujo de datos...
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-[#0d1117] rounded-lg animate-pulse">
            <div className="flex flex-col gap-2">
              <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-700 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-red-400">
          <ShieldAlert className="h-6 w-6" />
          Error en el flujo
        </h2>
        <div className="space-y-4">
          <p className="text-red-300 font-mono text-sm">{error}</p>
          <button
            onClick={fetchAnalysis}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen bg-[#0d1117] relative">
      {flowData ? (
        <ReactFlow
          nodes={flowData.nodes}
          edges={flowData.edges}
          fitView
          nodesDraggable
          minZoom={0.2}
          maxZoom={2}
          nodeOrigin={[0.5, 0.5]}
        >
          <Background color="#1f2937" gap={80} size={1} />
          <Controls
            className="[&>button]:bg-[#161b22] [&>button]:text-gray-200 [&>button]:border-[#30363d]"
            position="bottom-right"
          />
          <MiniMap
            nodeColor={getNodeColor}
            maskColor="rgba(13, 17, 23, 0.7)"
            style={{
              backgroundColor: "#0d1117",
              border: "1px solid #30363d",
            }}
          />
          <Panel position="top-center" className="bg-[#161b22] p-4 rounded-lg border border-[#30363d]">
            <h2 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              {repoData.selectedRepo} - Flujo de datos
            </h2>
          </Panel>
        </ReactFlow>
      ) : (
        <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 text-gray-400">
            <ShieldAlert className="h-6 w-6" />
            Visualización de flujo
          </h2>
          <p className="text-gray-400">
            {repoData.selectedRepo 
              ? "Analizando estructura de archivos..." 
              : "Selecciona un repositorio para comenzar"}
          </p>
        </div>
      )}
    </div>
  );
}