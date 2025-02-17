"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
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
  edges: any[];
}

export default function FlowSidebar({ apiUrl, repoData }: FlowSidebarProps) {
  const [flowData, setFlowData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getNodeColor = (node: FlowNode) => {
    switch (node.data.type) {
      case "security":
        return "#ef4444";
      case "input":
        return "#3b82f6";
      case "output":
        return "#10b981";
      default:
        return "#3b82f6";
    }
  };

  const autoLayout = (nodes: FlowNode[]) => {
    const NODE_WIDTH = 250;
    const NODE_HEIGHT = 100;
    const MARGIN = 40;
    let yPosition = MARGIN;

    return nodes.map((node) => {
      const positionedNode = {
        ...node,
        position: {
          x: MARGIN,
          y: yPosition,
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
        },
      };

      yPosition += NODE_HEIGHT + MARGIN;
      return positionedNode;
    });
  };

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "Genera un diagrama de seguridad con layout vertical. Formato respuesta JSON: { nodes: [ {id, data: {label, type} }, ... ], edges: [...] }",
            },
            {
              role: "user",
              content: JSON.stringify(repoData.repoStructure),
            },
          ],
          model: "deepseek-r1-distill-qwen-7b",
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const rawContent = data.choices[0].message.content;
      const parsedData: ApiResponse = JSON.parse(rawContent);

      if (!parsedData.nodes) throw new Error("Formato de respuesta inválido");

      setFlowData({
        nodes: autoLayout(parsedData.nodes),
        edges: parsedData.edges || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoData.selectedRepo && repoData.repoStructure?.length > 0) {
      fetchAnalysis();
    }
  }, [repoData.repoStructure, repoData.selectedRepo]);

  if (loading) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
          <ShieldAlert className="h-6 w-6" />
          Análisis de Seguridad
        </h2>
        <div className="space-y-4">
          <p className="text-gray-300">
            Analizando:{" "}
            <span className="font-mono text-blue-300">
              {repoData.selectedRepo}
            </span>
          </p>
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
          Error en Análisis
        </h2>
        <div className="space-y-4">
          <p className="text-red-300 font-mono text-sm">{error}</p>
          <button
            onClick={fetchAnalysis}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Reintentar Análisis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen bg-[#0d1117]">
      {flowData ? (
        <ReactFlow
          nodes={flowData.nodes}
          edges={flowData.edges}
          fitView
          nodesDraggable
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background color="#1f2937" gap={80} size={1} />
          <Controls
            className="[&>button]:bg-[#161b22] [&>button]:text-gray-200 [&>button]:border-[#30363d]"
            position="bottom-right"
          />
          <MiniMap
            nodeColor={(node) => getNodeColor(node)}
            maskColor="rgba(13, 17, 23, 0.7)"
            style={{
              backgroundColor: "#0d1117",
              border: "1px solid #30363d",
            }}
          />
          <Panel
            position="top-center"
            className="bg-[#161b22] p-4 rounded-lg border border-[#30363d] shadow-lg mb-4"
          >
            <h2 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              {repoData.selectedRepo} - Mapa de Seguridad
            </h2>
          </Panel>
        </ReactFlow>
      ) : (
        <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 text-gray-400">
            <ShieldAlert className="h-6 w-6" />
            Análisis de Seguridad
          </h2>
          <p className="text-gray-400">
            {repoData.selectedRepo
              ? "No se encontraron vulnerabilidades"
              : "Selecciona un repositorio para comenzar el análisis"}
          </p>
        </div>
      )}
    </div>
  );
}
