"use client";

import { Bot, Plus, Search, X } from "lucide-react";
import { useState } from "react";

interface Agent {
  id: string;
  label: string;
  description: string;
  apiUrl: string;
}

const initialAgents: Agent[] = [
  {
    id: "1",
    label: "Laplace",
    description: "Administra a los agentes",
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  },
  {
    id: "2",
    label: "Alan",
    description: "Analista Ciberseguridad",
    apiUrl: process.env.NEXT_PUBLIC_API_SEC_URL ?? "",
  },
  {
    id: "3",
    label: "John Smith",
    description: "Búsqueda en internet",
    apiUrl: "https://api.johnsmith.com",
  },
];

export function AgentsSection() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newAgent, setNewAgent] = useState<Omit<Agent, "id">>({
    label: "",
    description: "",
    apiUrl: "",
  });

  const filteredAgents = agents.filter((agent) =>
    agent.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddAgent = () => {
    if (!newAgent.label || !newAgent.description || !newAgent.apiUrl) {
      return;
    }

    const newAgentWithId: Agent = {
      id: `${Date.now()}`,
      ...newAgent,
    };
    
    setAgents((prevAgents) => [...prevAgents, newAgentWithId]);
    setNewAgent({ label: "", description: "", apiUrl: "" });
    setShowAddForm(false);
  };

  return (
    <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
        <Bot className="h-6 w-6" />
        Agentes IA
      </h2>

      <div className="space-y-4">
        <div className="flex gap-4 mb-6">
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

        {filteredAgents.length === 0 ? (
          <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
            <p className="text-gray-400">No se encontraron agentes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#30363d]">
                  <th className="px-4 py-3 text-left text-sm text-gray-400">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">Descripción</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">API URL</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="border-b border-[#30363d] hover:bg-[#0d1117]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-blue-400" />
                        <span className="text-gray-200">{agent.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {agent.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                      {agent.apiUrl}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] rounded-lg p-6 border border-[#30363d] w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-200">Nuevo Agente</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddAgent(); }} className="space-y-4">
              <input
                type="text"
                value={newAgent.label}
                onChange={(e) =>
                  setNewAgent({ ...newAgent, label: e.target.value })
                }
                placeholder="Nombre del agente"
                className="w-full p-2 rounded border border-[#30363d] bg-[#0d1117] text-gray-200"
                required
              />
              <input
                type="text"
                value={newAgent.description}
                onChange={(e) =>
                  setNewAgent({ ...newAgent, description: e.target.value })
                }
                placeholder="Descripción"
                className="w-full p-2 rounded border border-[#30363d] bg-[#0d1117] text-gray-200"
                required
              />
              <input
                type="url"
                value={newAgent.apiUrl}
                onChange={(e) =>
                  setNewAgent({ ...newAgent, apiUrl: e.target.value })
                }
                placeholder="URL de la API"
                className="w-full p-2 rounded border border-[#30363d] bg-[#0d1117] text-gray-200"
                required
              />
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Crear Agente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
