"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { File, Folder, ChevronRight, ChevronDown, Loader2, Bot } from 'lucide-react';
import type { CodeViewerProps, FileNode } from '../types/code-viewer';

export function CodeViewer({ repository }: CodeViewerProps) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchContent = async () => {
      if (!session?.accessToken || !repository) return;

      setLoading(true);
      setError(null);
      setSelectedFile(null);

      try {
        const baseUrl = repository.provider === 'github' 
          ? `https://api.github.com/repos/${repository.full_name}/contents`
          : `https://gitlab.com/api/v4/projects/${repository.id}/repository/tree`;

        const response = await fetch(baseUrl, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': repository.provider === 'github' 
              ? 'application/vnd.github+json'
              : 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch repository content');
        }

        const data = await response.json();
        setFiles(processFiles(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [repository, session]);

  const processFiles = (data: any[]): FileNode[] => {
    return data
      .sort((a, b) => {
        // Directories first, then files
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      })
      .map(item => ({
        name: item.name,
        path: item.path,
        type: item.type === 'dir' ? 'directory' : 'file',
        ...(item.type === 'dir' && { children: [] })
      }));
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileSelect = async (file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file);
      if (!file.content) {
        try {
          const response = await fetch(
            repository.provider === 'github'
              ? `https://api.github.com/repos/${repository.full_name}/contents/${file.path}`
              : `https://gitlab.com/api/v4/projects/${repository.id}/repository/files/${encodeURIComponent(file.path)}/raw`,
            {
              headers: {
                'Authorization': `Bearer ${session?.accessToken}`,
                'Accept': repository.provider === 'github'
                  ? 'application/vnd.github+json'
                  : 'application/json',
              },
            }
          );

          if (!response.ok) throw new Error('Failed to fetch file content');

          const content = await response.text();
          file.content = content;
          setSelectedFile({ ...file });
        } catch (err) {
          setError('Failed to load file content');
        }
      }
    } else {
      toggleFolder(file.path);
    }
  };

  const renderTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ paddingLeft: `${level * 16}px` }}>
        <button
          onClick={() => handleFileSelect(node)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#1c2128] rounded text-sm group ${
            selectedFile?.path === node.path ? 'bg-[#1c2128]' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {node.type === 'directory' && (
              expandedFolders.has(node.path)
                ? <ChevronDown className="h-4 w-4 text-gray-400" />
                : <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            {node.type === 'directory'
              ? <Folder className="h-4 w-4 text-blue-400" />
              : <File className="h-4 w-4 text-gray-400" />
            }
            <span className="text-gray-300 truncate">{node.name}</span>
          </div>
        </button>
        {node.type === 'directory' &&
         expandedFolders.has(node.path) &&
         node.children &&
         renderTree(node.children, level + 1)}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="bg-[#161b22] rounded-lg shadow-xl p-6 min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading repository content...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#161b22] rounded-lg shadow-xl p-6">
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-4 rounded-lg">
          <Bot className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#161b22] rounded-lg shadow-xl">
      <div className="p-4 border-b border-[#30363d]">
        <h2 className="text-lg font-semibold text-gray-200">
          {repository.full_name}
        </h2>
      </div>
      <div className="grid grid-cols-[300px_1fr]">
        <div className="border-r border-[#30363d] p-2 max-h-[600px] overflow-y-auto">
          {renderTree(files)}
        </div>
        <div className="p-4 max-h-[600px] overflow-y-auto">
          {selectedFile ? (
            selectedFile.content ? (
              <pre className="p-4 bg-[#0d1117] rounded-lg overflow-x-auto">
                <code className="text-sm text-gray-300 font-mono">
                  {selectedFile.content}
                </code>
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading file content...
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a file to view its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

