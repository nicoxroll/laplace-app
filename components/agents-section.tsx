// components/agents-section.tsx
"use client";

import { Bot, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "./custom-node";

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes = [
  {
    id: "1",
    type: "custom",
    data: {
      label: "Agente Director",
      description: "Administra a los agentes",
      apiUrl: "https://api.director.com",
    },
    position: { x: 250, y: 5 },
  },
  {
    id: "2",
    type: "custom",
    data: {
      label: "Alan",
      description: "Analista Ciberseguridad",
      apiUrl: "https://api.alan.com",
    },
    position: { x: 100, y: 100 },
  },
  {
    id: "3",
    type: "custom",
    data: {
      label: "John Smith",
      description: "Búsqueda en internet",
      apiUrl: "https://api.johnsmith.com",
    },
    position: { x: 400, y: 100 },
  },
];

const proOptions = { hideAttribution: true };
const initialEdges = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "#60a5fa", strokeWidth: 2 },
  },
  {
    id: "e1-3",
    source: "1",
    target: "3",
    animated: true,
    style: { stroke: "#60a5fa", strokeWidth: 2 },
  },
];

export function AgentsSection() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAgent, setNewAgent] = useState({
    label: "",
    description: "",
    apiUrl: "",
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAgents = nodes.filter((node) =>
    node.data.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddAgent = () => {
    const newNodeId = (nodes.length + 1).toString();
    const newNode = {
      id: newNodeId,
      type: "custom",
      data: {
        label: newAgent.label,
        description: newAgent.description,
        apiUrl: newAgent.apiUrl,
      },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };

    setNodes((nds) => nds.concat(newNode));

    if (selectedNodeId) {
      setEdges((eds) =>
        addEdge(
          {
            id: `e${selectedNodeId}-${newNodeId}`,
            source: selectedNodeId,
            target: newNodeId,
            animated: true,
            style: { stroke: "#60a5fa", strokeWidth: 2 },
          },
          eds
        )
      );
    }

    setNewAgent({ label: "", description: "", apiUrl: "" });
    setShowAddForm(false);
    setSelectedNodeId(null);
  };

  return (
    <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
        <Bot className="h-6 w-6" />
        Agentes IA
      </h2>

      <div className="space-y-6">
        {/* Barra de búsqueda y botón de agregar */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar agentes..."
              className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="h-4 w-4 text-gray-500 absolute left-3 top-2.5" />
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Agente
          </button>
        </div>

        {/* Lista de Agentes */}
        <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <h3 className="text-sm font-semibold mb-3 text-gray-400">
            Lista de Agentes ({filteredAgents.length})
          </h3>
          <div className="space-y-2">
            {filteredAgents.map((node) => (
              <div
                key={node.id}
                className="flex items-center justify-between p-3 bg-[#161b22] rounded border border-[#30363d] hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-blue-400" />
                  <div>
                    <h4 className="text-gray-200">{node.data.label}</h4>
                    <p className="text-xs text-gray-400">
                      {node.data.description}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {node.data.apiUrl}
                </span>
              </div>
            ))}
            {filteredAgents.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No se encontraron agentes
              </div>
            )}
          </div>
        </div>

        {/* Diagrama de flujo */}
        <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <h3 className="text-sm font-semibold mb-3 text-gray-400">
            Diagrama de Jerarquía
          </h3>
          <div style={{ height: "500px" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(e, node) => setSelectedNodeId(node.id)}
              fitView
              nodesDraggable
              proOptions={proOptions}
              minZoom={0.5}
              maxZoom={1.5}
            >
              <Background color="#1f2937" gap={80} size={1} />
              <Controls
                className="[&>button]:bg-[#161b22] [&>button]:text-gray-200 [&>button]:border-[#30363d]"
                position="bottom-right"
              />
              <style>{`
                .react-flow__edge-path {
                  stroke: #60a5fa;
                  stroke-width: 2;
                  stroke-opacity: 0.9;
                }
                .react-flow__edge-animated {
                  animation: dash 1.5s linear infinite;
                  stroke-dasharray: 5;
                }
                @keyframes dash {
                  from {
                    stroke-dashoffset: 10;
                  }
                  to {
                    stroke-dashoffset: 0;
                  }
                }
              `}</style>
            </ReactFlow>
          </div>
        </div>

        {/* Modal de nuevo agente */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#161b22] rounded-lg p-6 border border-[#30363d] w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-200">
                  Nuevo Agente
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newAgent.label}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, label: e.target.value })
                  }
                  placeholder="Nombre del agente"
                  className="w-full p-2 rounded border border-[#30363d] bg-[#0d1117] text-gray-200 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newAgent.description}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, description: e.target.value })
                  }
                  placeholder="Descripción"
                  className="w-full p-2 rounded border border-[#30363d] bg-[#0d1117] text-gray-200 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newAgent.apiUrl}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, apiUrl: e.target.value })
                  }
                  placeholder="URL de la API"
                  className="w-full p-2 rounded border border-[#30363d] bg-[#0d1117] text-gray-200 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddAgent}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Crear Agente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
