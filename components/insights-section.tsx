"use client";

import { File, FileText, Folder, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";

interface TreeNode {
  name: string;
  path: string;
  type: "dir" | "file";
  children?: TreeNode[];
}

interface FileTypeData {
  name: string;
  value: number;
  color: string;
}

const COLORS = [
  "#58a6ff",
  "#7ee787",
  "#ff7b72",
  "#d2a8ff",
  "#79c0ff",
  "#a5d6ff",
];

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const LEVEL_SPACING = 300;

export function InsightsSection({
  selectedRepo,
}: {
  selectedRepo: string | null;
}) {
  const { data: session } = useSession();
  const [repoStructure, setRepoStructure] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generar datos para el gráfico de nodos
  const { nodes, edges } = useMemo(() => {
    const nodes: any[] = [];
    const edges: any[] = [];
    let xPos = 0;
    let yPos = 0;

    const processNode = (node: TreeNode, parentId?: string, depth = 0) => {
      const id = node.path;
      const isDir = node.type === "dir";

      // Posicionamiento
      xPos = depth * LEVEL_SPACING;
      yPos += NODE_HEIGHT + 20;

      nodes.push({
        id,
        data: {
          label: (
            <div className="flex items-center gap-2 p-2">
              {isDir ? (
                <Folder className="h-4 w-4 text-[#58a6ff]" />
              ) : (
                <File className="h-4 w-4 text-[#7ee787]" />
              )}
              <span className="text-sm text-white">{node.name}</span>
            </div>
          ),
        },
        position: { x: xPos, y: yPos },
        style: {
          background: isDir ? "#1f2937" : "#374151",
          border: "1px solid #30363d",
          borderRadius: "6px",
          width: `${NODE_WIDTH}px`,
        },
      });

      if (parentId) {
        edges.push({
          id: `${parentId}-${id}`,
          source: parentId,
          target: id,
          animated: isDir,
          style: {
            stroke: "#3f3f46",
            strokeWidth: 2,
          },
        });
      }

      node.children?.forEach((child) => processNode(child, id, depth + 1));
    };

    repoStructure.forEach((node) => processNode(node));
    return { nodes, edges };
  }, [repoStructure]);

  const fileTypeDistribution = useMemo(() => {
    const countMap: Record<string, number> = {};

    const countNodes = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        if (node.type === "dir") {
          if (node.children) countNodes(node.children);
        } else {
          const extension =
            node.name.split(".").pop()?.toLowerCase() || "otros";
          countMap[extension] = (countMap[extension] || 0) + 1;
        }
      });
    };

    countNodes(repoStructure);

    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({
        name: name === "otros" ? "Otros archivos" : `.${name}`,
        value,
        color: COLORS[index % COLORS.length],
      }));
  }, [repoStructure]);

  const buildTree = async (
    contents: any[],
    owner: string,
    repo: string
  ): Promise<TreeNode[]> => {
    return Promise.all(
      contents.map(async (item) => {
        const node: TreeNode = {
          name: item.name,
          path: item.path,
          type: item.type === "dir" ? "dir" : "file",
        };

        if (node.type === "dir" && session?.accessToken) {
          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`,
            {
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            }
          );
          const dirContents = await response.json();
          node.children = await buildTree(dirContents, owner, repo);
        }

        return node;
      })
    );
  };

  useEffect(() => {
    const fetchRepoStructure = async () => {
      if (!selectedRepo || !session?.accessToken) return;

      try {
        setLoading(true);
        const [owner, repo] = selectedRepo.split("/");

        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );

        if (!response.ok) throw new Error("Error fetching structure");

        const contents = await response.json();
        const tree = await buildTree(contents, owner, repo);
        setRepoStructure(tree);
      } catch (err) {
        setError("Error loading repository structure");
      } finally {
        setLoading(false);
      }
    };

    fetchRepoStructure();
  }, [selectedRepo, session?.accessToken]);

  return (
    <div className="max-w-4xl p-4 bg-[#161b22] rounded-lg space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <FileText className="h-5 w-5" /> Repository Insights
      </h2>

      {selectedRepo ? (
        <div className="space-y-6">
          {loading && (
            <div className="flex justify-center items-center gap-2 text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analizando repositorio...
            </div>
          )}

          {!loading && !error && (
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
              <h3 className="text-lg font-semibold mb-4">
                Distribución de archivos
              </h3>
              <div className="flex justify-center">
                <PieChart width={500} height={300}>
                  <Pie
                    data={fileTypeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={true}
                    animationBegin={100}
                    animationDuration={400}
                    animationEasing="ease-out"
                  >
                    {fileTypeDistribution.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.color}
                        stroke="#0d1117"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0d1117",
                      border: "1px solid #30363d",
                      borderRadius: "6px",
                    }}
                    itemStyle={{ color: "#c9d1d9" }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={12}
                    wrapperStyle={{
                      color: "#8b949e",
                      fontSize: "14px",
                      paddingLeft: "20px",
                    }}
                  />
                </PieChart>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d] h-[600px]">
              <h3 className="text-lg font-semibold mb-4">
                Estructura del Repositorio
              </h3>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                nodesDraggable={true}
                nodesConnectable={false}
                panOnDrag={true}
                zoomOnScroll={true}
              >
                <Background color="#30363d" gap={20} />
                <Controls />
                <MiniMap
                  nodeColor={(n) =>
                    n.data.props?.isDir ? "#58a6ff" : "#7ee787"
                  }
                  maskColor="#30363d"
                />
              </ReactFlow>
            </div>
          )}

          {error && (
            <div className="text-red-400 p-4 border border-red-400/30 rounded-lg">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-gray-400 border border-[#30363d] rounded-lg">
          Selecciona un repositorio para ver el análisis
        </div>
      )}
    </div>
  );
}
