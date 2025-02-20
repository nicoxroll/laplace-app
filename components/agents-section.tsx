// components/agents-section.tsx
import { Bot } from "lucide-react";
import React, { useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

const initialNodes = [
  {
    id: "1",
    data: { label: "Agente Director\nAdministra a los agentes" },
    position: { x: 250, y: 5 },
    style: { backgroundColor: "#3b82f6", color: "#fff", padding: "10px", borderRadius: "5px" },
  },
  {
    id: "2",
    data: { label: "Alan\nAnalista Ciberseguridad" },
    position: { x: 100, y: 100 },
    style: { backgroundColor: "#10b981", color: "#fff", padding: "10px", borderRadius: "5px" },
  },
  {
    id: "3",
    data: { label: "John Smith\nBúsqueda en internet" },
    position: { x: 400, y: 100 },
    style: { backgroundColor: "#10b981", color: "#fff", padding: "10px", borderRadius: "5px" },
  },
];

const initialEdges = [
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e1-3", source: "1", target: "3", animated: true },
];

export function AgentsSection({
  selectedRepo,
}: {
  selectedRepo: string | null;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [newAgentName, setNewAgentName] = useState("");

  const handleAddAgent = () => {
    const newNodeId = (nodes.length + 1).toString();
    const newNode = {
      id: newNodeId,
      data: { label: `${newAgentName}\nNuevo Agente` },
      position: { x: Math.random() * 400, y: Math.random() * 400 }, // Posición aleatoria
      style: { backgroundColor: "#10b981", color: "#fff", padding: "10px", borderRadius: "5px" },
    };

    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => addEdge({ id: `e1-${newNodeId}`, source: "1", target: newNodeId, animated: true }, eds));
    setNewAgentName(""); // Limpiar el campo de entrada
  };

  return (
    <div className="max-w-4xl p-4 bg-[#161b22] rounded-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Bot className="h-5 w-5" /> AI Agents
      </h2>
      {selectedRepo ? (
        <div className="space-y-4">
          <p>AI tools for: {selectedRepo}</p>
          <div className="p-4 bg-[#0d1117] rounded">
            <p>Code generation assistant</p>
          </div>
          <div className="flex flex-col mb-4">
            <input
              type="text"
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              placeholder="Nombre del nuevo agente"
              className="p-2 rounded border border-gray-600 mb-2"
            />
            <button
              onClick={handleAddAgent}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Agregar Agente
            </button>
          </div>
          <div style={{ height: "400px" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
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
                nodeColor={(node) => (node.data.label.includes("Agente Director") ? "#3b82f6" : "#10b981")}
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
                  <Bot className="h-5 w-5" />
                  Jerarquía de Agentes
                </h2>
              </Panel>
            </ReactFlow>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Select a repository to use AI agents</p>
      )}
    </div>
  );
}