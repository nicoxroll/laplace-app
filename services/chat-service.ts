import type { RepositoryContext } from "@/types/repository";
import { CodeIndexer } from "./code-indexer";

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

  // Add this method to clear the indexer when switching providers
  clearCodeIndexer() {
    this.codeIndexer = null;
  }

  // Updated to handle provider and use approach similar to SecuritySection
  async initializeCodeIndexer(
    token: string,
    repoFullName: string,
    provider = "github",
    progressCallback?: (progress: number) => void // Add this parameter
  ) {
    try {
      console.log(`Initializing ${provider} code indexer for ${repoFullName}`);

      // Clear any previous indexer if provider changed
      if (this.codeIndexer?.getProvider() !== provider) {
        this.codeIndexer = null;
      }

      if (!this.codeIndexer) {
        this.codeIndexer = new CodeIndexer(token);
      }

      // Set the progress callback if provided
      if (progressCallback) {
        this.codeIndexer.onProgress(progressCallback);
      }

      // Pass the provider to indexRepository
      await this.codeIndexer.indexRepository(repoFullName, provider);
      return this.codeIndexer;
    } catch (error) {
      console.error(`Error initializing ${provider} code indexer:`, error);
      throw error;
    }
  }

  formatRepoContext(context: RepositoryContext): string {
    let formattedContext = `You are analyzing a ${
      context.provider || "github"
    } repository: ${context.repository.full_name}
Repository description: ${
      context.repository.description || "No description provided"
    }
Default branch: ${context.repository.default_branch || "main"}
`;

    if (this.codeIndexer?.codebase) {
      // Get file stats for better processing
      const allFiles = Object.keys(this.codeIndexer.codebase);
      const totalSize = Object.values(this.codeIndexer.codebase).reduce(
        (acc, content) =>
          acc + (typeof content === "string" ? content.length : 0),
        0
      );

      console.log(
        `Repository has ${allFiles.length} files with total size: ${(
          totalSize /
          1024 /
          1024
        ).toFixed(2)}MB`
      );

      // Add repository structure overview
      formattedContext += "\nRepository file structure:\n";
      this.addFileStructureToContext(formattedContext, allFiles);

      // Set size limits to avoid context overflow
      const MAX_CONTEXT_SIZE = 150000; // ~150KB context limit
      let currentSize = 0;

      // First add current file if available
      if (context.currentPath && context.currentFile?.content) {
        formattedContext += `\nCurrently focused on path: ${context.currentPath}\n`;
        formattedContext += `\nCurrent file content:\n\`\`\`${
          context.currentFile.language || "text"
        }\n${this.truncateContent(
          Array.isArray(context.currentFile.content)
            ? context.currentFile.content.join("\n")
            : context.currentFile.content,
          30000
        )}\n\`\`\`\n`;

        currentSize += context.currentFile.content.length;
      }

      // Get relevant files for context
      const relevantFiles = this.getRelevantFiles(
        context.currentPath,
        this.codeIndexer.codebase
      );

      // Add important files that provide context
      const importantPatterns = [
        "package.json",
        "config",
        ".env",
        "security",
        "auth",
        "api",
      ];

      for (const [path, content] of Object.entries(relevantFiles)) {
        if (currentSize >= MAX_CONTEXT_SIZE) break;

        // Prioritize important files first
        const isImportant = importantPatterns.some((pattern) =>
          path.toLowerCase().includes(pattern)
        );
        if (!isImportant) continue;

        formattedContext += `\nFile: ${path}\n\`\`\`${
          path.split(".").pop() || "text"
        }\n${this.truncateContent(content, 5000)}\n\`\`\`\n`;

        currentSize += content.length > 5000 ? 5000 : content.length;
      }

      // Add remaining relevant files
      for (const [path, content] of Object.entries(relevantFiles)) {
        if (currentSize >= MAX_CONTEXT_SIZE) break;

        // Skip files we've already included
        const isImportant = importantPatterns.some((pattern) =>
          path.toLowerCase().includes(pattern)
        );
        if (isImportant) continue;

        formattedContext += `\nFile: ${path}\n\`\`\`${
          path.split(".").pop() || "text"
        }\n${this.truncateContent(content, 3000)}\n\`\`\`\n`;

        currentSize += content.length > 3000 ? 3000 : content.length;
      }
    }

    return formattedContext;
  }

  // Helper to add file structure to context
  private addFileStructureToContext(context: string, files: string[]): string {
    // Group by directories for organization
    const directories = new Set<string>();
    files.forEach((file) => {
      const parts = file.split("/");
      if (parts.length > 1) {
        directories.add(parts[0]);
      }
    });

    // Show directory structure
    let result = context;
    const rootFiles = files.filter((f) => !f.includes("/"));

    if (rootFiles.length > 0) {
      result += "\nRoot files:\n";
      rootFiles.slice(0, 10).forEach((f) => {
        result += `- ${f}\n`;
      });
      if (rootFiles.length > 10) {
        result += `- ... and ${rootFiles.length - 10} more files\n`;
      }
    }

    directories.forEach((dir) => {
      const dirFiles = files.filter((f) => f.startsWith(`${dir}/`));
      if (dirFiles.length > 0) {
        result += `\n${dir}/: ${dirFiles.length} files\n`;
      }
    });

    return result;
  }

  private getRelevantFiles(
    currentPath: string,
    codebase: Record<string, string>
  ): Record<string, string> {
    const relevantFiles: Record<string, string> = {};
    const maxFiles = 15; // Increased from 10 to 15 for better context
    let count = 0;

    // Add the current file first if it exists
    if (currentPath && codebase[currentPath]) {
      relevantFiles[currentPath] = codebase[currentPath];
      count++;
    }

    // Add files in the same directory
    const currentDir = currentPath
      ? currentPath.split("/").slice(0, -1).join("/")
      : "";
    if (currentDir) {
      for (const path of Object.keys(codebase)) {
        if (count >= maxFiles) break;

        const fileDir = path.split("/").slice(0, -1).join("/");
        if (fileDir === currentDir && path !== currentPath) {
          relevantFiles[path] = codebase[path];
          count++;
        }
      }
    }

    // Add important config files
    const importantPatterns = [
      "package.json",
      "config",
      ".env",
      "security",
      "auth",
    ];
    for (const path of Object.keys(codebase)) {
      if (count >= maxFiles) break;
      if (path in relevantFiles) continue;

      const isImportant = importantPatterns.some((pattern) =>
        path.toLowerCase().includes(pattern)
      );

      if (isImportant) {
        relevantFiles[path] = codebase[path];
        count++;
      }
    }

    // If we still have space, add other files
    for (const path of Object.keys(codebase)) {
      if (count >= maxFiles) break;
      if (!relevantFiles[path]) {
        relevantFiles[path] = codebase[path];
        count++;
      }
    }

    return relevantFiles;
  }

  // Improved truncation to handle large files better
  private truncateContent(content: string, maxLength: number = 5000): string {
    if (!content || content.length <= maxLength) return content || "";

    // For very large files, focus on important sections
    const lines = content.split("\n");

    if (lines.length > 100) {
      // Grab first section (most important for context)
      const start = lines.slice(0, 50).join("\n");

      // Look for imports and functions
      const importantLines = lines
        .filter(
          (line) =>
            line.includes("import ") ||
            line.includes("export ") ||
            line.includes("function ") ||
            line.includes("class ")
        )
        .slice(0, 30)
        .join("\n");

      // Grab the end
      const end = lines.slice(-20).join("\n");

      return `${start}\n\n// ... file truncated ...\n\n// Important sections:\n${importantLines}\n\n// ... end of file ...\n${end}`;
    }

    // For smaller files, take beginning and end
    return (
      content.slice(0, maxLength * 0.7) +
      "\n// ... content truncated ...\n" +
      content.slice(-maxLength * 0.3)
    );
  }

  // Keep existing handleSubmit method
  async handleSubmit(
    input: string,
    repoContext: string,
    signal: AbortSignal,
    onStart: () => void,
    onUpdate: (content: string) => void
  ): Promise<void> {
    try {
      onStart();

      // Log context size for debugging
      console.log(
        `Submitting chat with context size: ${repoContext.length} chars`
      );

      // If context is too large, truncate it with a warning
      const MAX_API_CONTEXT = 250000; // ~250KB context limit
      let finalContext = repoContext;

      if (repoContext.length > MAX_API_CONTEXT) {
        console.warn(
          `Context too large (${repoContext.length} chars), truncating to ${MAX_API_CONTEXT} chars`
        );
        finalContext =
          repoContext.substring(0, MAX_API_CONTEXT) +
          "\n\n[CONTEXT TRUNCATED DUE TO SIZE LIMITATIONS]";
      }

      const response = await fetch(process.env.NEXT_PUBLIC_API_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-r1-distill-qwen-1.5b",
          messages: [
            {
              role: "system",
              content: finalContext,
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
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`API error (${response.status}): ${errorText}`);
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
            if (line.trim().startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.delta?.content) {
                  accumulatedContent += data.choices[0].delta.content;
                  onUpdate(accumulatedContent);
                }
              } catch (e) {
                console.warn("Error parsing chunk:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      if ((error as Error).name !== "AbortError") {
        throw error;
      }
    }
  }
}
