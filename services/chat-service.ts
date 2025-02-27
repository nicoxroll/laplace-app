import { Octokit } from "octokit";
import { CodeIndexer } from "./code-indexer";
import type { RepositoryContext } from "@/types/repository";
import type { Message } from "@/types/chat";

export class ChatService {
  private static instance: ChatService;
  private codeIndexer: CodeIndexer | null = null;

  private constructor() {}

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  setCodeIndexer(indexer: CodeIndexer) {
    this.codeIndexer = indexer;
  }

  getCodeIndexer() {
    return this.codeIndexer;
  }

  formatRepoContext(context: RepositoryContext): string {
    let formattedContext = `You are analyzing a ${context.provider} repository: ${context.repository.full_name}\n`;
    
    if (this.codeIndexer?.codebase) {
      formattedContext += "\nRepository structure and contents:\n";
      
      // Procesar solo los archivos más relevantes para el contexto actual
      const relevantFiles = this.getRelevantFiles(context.currentPath, this.codeIndexer.codebase);
      
      for (const [path, content] of Object.entries(relevantFiles)) {
        formattedContext += `\nFile: ${path}\nContent:\n${this.truncateContent(content)}\n`;
      }
    }

    if (context.currentPath) {
      formattedContext += `\nCurrently focused on path: ${context.currentPath}`;
    }

    if (context.currentFile) {
      formattedContext += `\nCurrent file content:\n${context.currentFile.content}`;
    }

    return formattedContext;
  }

  private getRelevantFiles(currentPath: string, codebase: Record<string, string>): Record<string, string> {
    const relevantFiles: Record<string, string> = {};
    const maxFiles = 10;
    let count = 0;

    // Primero agregar el archivo actual y sus hermanos
    const currentDir = currentPath.split('/').slice(0, -1).join('/');
    
    for (const [path, content] of Object.entries(codebase)) {
      if (count >= maxFiles) break;

      // Priorizar archivos en el mismo directorio
      if (path.startsWith(currentDir)) {
        relevantFiles[path] = content;
        count++;
      }
    }

    // Si aún hay espacio, agregar otros archivos importantes
    for (const [path, content] of Object.entries(codebase)) {
      if (count >= maxFiles) break;
      if (!relevantFiles[path]) {
        relevantFiles[path] = content;
        count++;
      }
    }

    return relevantFiles;
  }

  private truncateContent(content: string, maxLength: number = 1000): string {
    if (content.length <= maxLength) return content;
    
    const lines = content.split('\n');
    if (lines.length > 50) {
      const important = [
        ...lines.slice(0, 20),
        '...',
        ...lines.slice(lines.length - 20)
      ];
      return important.join('\n');
    }
    
    return content.slice(0, maxLength) + '...';
  }

  async initializeCodeIndexer(token: string, repoFullName: string) {
    this.codeIndexer = new CodeIndexer(token);
    try {
      const codebase = await this.codeIndexer.indexRepository(repoFullName);
      this.codeIndexer.codebase = codebase;
    } catch (error) {
      console.error("Error indexing repository:", error);
    }
  }

  async streamResponse(
    apiUrl: string,
    messages: Message[],
    context: RepositoryContext,
    signal: AbortSignal,
    onChunk: (content: string) => void
  ): Promise<void> {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) throw new Error("Failed to get response");

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response stream available");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices?.[0]?.delta?.content) {
              onChunk(data.choices[0].delta.content);
            }
          } catch (err) {
            console.error("Error parsing chunk:", err);
          }
        }
      }
    }
  }

  async handleSubmit(
    input: string,
    repoContext: string,
    signal: AbortSignal,
    onStart: () => void,
    onUpdate: (content: string) => void
  ): Promise<void> {
    try {
      onStart(); // Llamamos esto antes de hacer el fetch

      const response = await fetch(process.env.NEXT_PUBLIC_API_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-r1-distill-qwen-7b",
          messages: [
            {
              role: "system",
              content: repoContext,
            },
            {
              role: "user",
              content: input,
            },
          ],
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.delta?.content) {
                  accumulatedContent += data.choices[0].delta.content;
                  onUpdate(accumulatedContent);
                }
              } catch (e) {
                console.error("Error parsing chunk:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }
}
