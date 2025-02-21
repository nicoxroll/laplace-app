"use client";

import { File, FileText, Folder } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";

interface TreeNode {
  name: string;
  path: string;
  type: "dir" | "file";
  size?: number;
  children?: TreeNode[];
}

const COLORS = [
  "#58a6ff",
  "#7ee787",
  "#ff7b72",
  "#d2a8ff",
  "#79c0ff",
  "#a5d6ff",
];

export function InsightsSection({
  selectedRepo,
}: {
  selectedRepo: string | null;
}) {
  const { data: session } = useSession();
  const [repoStructure, setRepoStructure] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        } else if (node.type === "file" && session?.accessToken) {
          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`,
            {
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            }
          );
          const fileData = await response.json();
          node.size = fileData.size;
        }

        return node;
      })
    );
  };

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path} className="ml-4">
        <div className="flex items-center gap-2 py-1">
          <div
            className="flex items-center gap-2 text-gray-300 hover:bg-[#1f2937] px-2 rounded"
            style={{ marginLeft: `${level * 20}px` }}
          >
            {node.type === "dir" ? (
              <Folder className="h-4 w-4 text-[#58a6ff]" />
            ) : (
              <File className="h-4 w-4 text-[#7ee787]" />
            )}
            <span className="text-sm">{node.name}</span>
            {node.type === "file" && node.size && (
              <span className="text-xs text-gray-400">({node.size} bytes)</span>
            )}
          </div>
        </div>
        {node.children && renderTree(node.children, level + 1)}
      </div>
    ));
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
    <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
        <FileText className="h-6 w-6" />
        Repository Insights - {selectedRepo || "Sin repositorio seleccionado"}
      </h2>

      {selectedRepo ? (
        <div className="space-y-6">
          {loading && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0d1117] rounded-lg animate-pulse">
                <div className="flex flex-col gap-2">
                  <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-700 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
                <h3 className="text-lg font-semibold mb-4 text-gray-200">
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

              <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
                <h3 className="text-lg font-semibold mb-4 text-gray-200">
                  Estructura del Repositorio
                </h3>
                <div className="max-h-[400px] overflow-y-auto font-mono text-sm">
                  {renderTree(repoStructure)}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="p-4 bg-red-500/20 rounded-lg border border-red-500/30">
              <p className="text-red-400">{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <p className="text-gray-400 italic">
            Selecciona un repositorio para ver los insights
          </p>
        </div>
      )}
    </div>
  );
}
