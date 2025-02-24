"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { File, Folder, ChevronRight, ChevronDown, Loader2, Bot, Copy, Download, Image as ImageIcon, ExternalLink } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { CodeViewerProps, FileNode } from '../types/code-viewer';

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then(mod => mod.Prism),
  { ssr: false }
);

const oneDark = dynamic(
  () => import('react-syntax-highlighter/dist/esm/styles/prism').then(mod => mod.oneDark),
  { ssr: false }
);

const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

export function CodeViewer({ repository }: CodeViewerProps) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const fetchContent = async (path: string = '') => {
    if (!session?.user?.accessToken) return [];

    const isGithub = session.user.provider === 'github';
    const baseUrl = isGithub
      ? `https://api.github.com/repos/${repository.full_name}/contents/${path}`
      : `https://gitlab.com/api/v4/projects/${repository.id}/repository/tree?path=${path}`;

    try {
      const response = await fetch(baseUrl, {
        headers: {
          'Authorization': `Bearer ${session.user.accessToken}`,
          'Accept': isGithub ? 'application/vnd.github.v3+json' : 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch content');

      const data = await response.json();
      
      // Transform the data based on the provider
      return data.map((item: any) => ({
        id: item.sha || item.id,
        name: item.name,
        path: item.path,
        type: (item.type === 'dir' || item.type === 'tree') ? 'directory' : 'file',
        children: [],
      })).sort((a: FileNode, b: FileNode) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });
    } catch (err) {
      console.error('Error fetching content:', err);
      return [];
    }
  };

  const fetchFileContent = async (file: FileNode) => {
    if (!session?.user?.accessToken) return null;

    const isGithub = session.user.provider === 'github';
    const url = isGithub
      ? `https://api.github.com/repos/${repository.full_name}/contents/${file.path}`
      : `https://gitlab.com/api/v4/projects/${repository.id}/repository/files/${encodeURIComponent(file.path)}/raw`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.user.accessToken}`,
          'Accept': isGithub ? 'application/vnd.github.v3.raw' : 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch file content');
      const content = await response.text();
      return content;
    } catch (err) {
      console.error('Error fetching file:', err);
      return null;
    }
  };

  useEffect(() => {
    const loadInitialContent = async () => {
      setLoading(true);
      try {
        const content = await fetchContent();
        setFiles(content);
      } catch (err) {
        setError('Failed to load repository content');
      } finally {
        setLoading(false);
      }
    };

    if (repository && session?.user?.accessToken) {
      loadInitialContent();
    }
  }, [repository, session]);

  const handleFileSelect = async (file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile({ ...file, content: 'Loading...' });
      const content = await fetchFileContent(file);
      if (content) {
        setSelectedFile({ ...file, content });
      }
    }
  };

  const handleFolderToggle = async (path: string) => {
    const isExpanded = expandedFolders.has(path);
    const newExpanded = new Set(expandedFolders);

    if (isExpanded) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      const content = await fetchContent(path);
      updateFilesWithChildren(path, content);
    }

    setExpandedFolders(newExpanded);
  };

  const updateFilesWithChildren = (path: string, children: FileNode[]) => {
    setFiles(prevFiles => {
      const updateNode = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.path === path) {
            return { ...node, children };
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      return updateNode(prevFiles);
    });
  };

  const renderTree = (nodes: FileNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.path} style={{ paddingLeft: `${level * 16}px` }}>
        <button
          onClick={() => node.type === 'directory' 
            ? handleFolderToggle(node.path)
            : handleFileSelect(node)
          }
          className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#1c2128] rounded text-sm group ${
            selectedFile?.path === node.path ? 'bg-[#1c2128]' : ''
          }`}
        >
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
      <div className="bg-[#161b22] rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-2" />
          <span className="text-gray-400">Loading repository content...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#161b22] rounded-lg shadow-xl p-6">
        <div className="text-red-400 flex items-center gap-2">
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
            <div className="rounded-lg border border-[#30363d] overflow-hidden">
              <div className="bg-[#161b22] p-3 flex items-center justify-between border-b border-[#30363d]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {isImageFile(selectedFile.name) ? (
                      <ImageIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <File className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-400">{selectedFile.name}</span>
                  </div>
                  {!isImageFile(selectedFile.name) && (
                    <>
                      <span className="text-xs text-gray-500">
                        {selectedFile.content.split('\n').length} lines
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Blob([selectedFile.content]).size} Bytes
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isImageFile(selectedFile.name) && (
                    <a
                      href={selectedFile.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-[#1c2128] rounded-md group"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                    </a>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedFile.content)}
                    className="p-1.5 hover:bg-[#1c2128] rounded-md group"
                    title="Copy"
                  >
                    <Copy className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                  </button>
                  <button
                    onClick={() => {
                      const blob = isImageFile(selectedFile.name)
                        ? fetch(selectedFile.content).then(r => r.blob())
                        : new Blob([selectedFile.content], { type: 'text/plain' });
                      
                      Promise.resolve(blob).then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = selectedFile.name;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      });
                    }}
                    className="p-1.5 hover:bg-[#1c2128] rounded-md group"
                    title="Download"
                  >
                    <Download className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                  </button>
                </div>
              </div>
              <div className="relative">
                {isImageFile(selectedFile.name) ? (
                  <div className="p-4 bg-[#0d1117] flex items-center justify-center">
                    <div className="relative group max-w-full">
                      <img
                        src={selectedFile.content}
                        alt={selectedFile.name}
                        className="max-w-full max-h-[500px] rounded border border-[#30363d]"
                      />
                      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="absolute top-0 left-0 w-[50px] h-full flex flex-col items-end pr-2 py-4 bg-[#0d1117] text-gray-500 text-xs select-none border-r border-[#30363d]">
                      {selectedFile.content.split('\n').map((_, i) => (
                        <div key={i + 1} className="leading-5">{i + 1}</div>
                      ))}
                    </div>
                    <div className="pl-[50px]">
                      <SyntaxHighlighter
                        language="typescript"
                        style={oneDark}
                        customStyle={{
                          background: '#0d1117',
                          padding: '1rem',
                          margin: 0,
                          borderRadius: 0,
                        }}
                        showLineNumbers={false}
                      >
                        {selectedFile.content}
                      </SyntaxHighlighter>
                    </div>
                  </>
                )}
              </div>
            </div>
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

