"use client";

import { useRepository } from "@/contexts/repository-context";
import { ArrowLeft, ChevronRight, File, Folder, Search } from "lucide-react";

export function FileTree() {
  const {
    tree,
    currentFolder,
    searchTerm,
    isTreeLoading,
    setSearchTerm,
    handleTreeItemClick,
    handleTreeBack,
  } = useRepository();

  const filteredTree = tree.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#161b22]">
      <div className="h-[41px] px-4 flex items-center border-b border-[#30363d]">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 h-7 bg-[#0d1117] border border-[#30363d] rounded-md text-sm text-gray-300 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
          />
          <Search className="h-3.5 w-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-custom">
        <div className="p-2">
          {currentFolder && (
            <button
              onClick={handleTreeBack}
              className="flex items-center gap-2 w-full px-2 py-2 mb-2 hover:bg-[#1c2128] rounded-md text-gray-400 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>
                Back to {currentFolder.split("/").slice(0, -1).pop() || "root"}
              </span>
            </button>
          )}

          {isTreeLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredTree.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleTreeItemClick(item)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-[#1c2128] rounded-md text-left text-sm group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.type === "dir" ? (
                      <>
                        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                        <Folder className="h-4 w-4 text-gray-400 shrink-0" />
                      </>
                    ) : (
                      <>
                        <span className="w-4" />
                        <File className="h-4 w-4 text-gray-400 shrink-0" />
                      </>
                    )}
                    <span className="text-gray-300 truncate">{item.name}</span>
                  </div>
                </button>
              ))}
              {filteredTree.length === 0 && searchTerm && (
                <div className="text-center py-4 text-gray-400">
                  No files found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
