// services/code-indexer.ts
import { Octokit } from "octokit";

export class CodeIndexer {
  private octokit: Octokit;
  public codebase: Record<string, string> = {};
  private maxFileSize = 1000000; // 1MB
  private chunkSize = 100000; // 100KB por chunk

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async indexRepository(repoFullName: string) {
    try {
      const [owner, repo] = repoFullName.split("/");
      
      // Primero verificar si el repo está vacío
      const repoInfo = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      if (repoInfo.data.size === 0) {
        console.log("Repository is empty");
        return {};
      }

      // Si no está vacío, intentar obtener el árbol desde la rama por defecto
      const defaultBranch = repoInfo.data.default_branch;
      
      try {
        const { data: refData } = await this.octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${defaultBranch}`,
        });

        const tree = await this.getRepoTree(owner, repo, refData.object.sha);
        this.codebase = await this.processTree(owner, repo, tree);
        return this.codebase;
      } catch (error) {
        console.log("Repository might be empty or inaccessible");
        return {};
      }
    } catch (error) {
      console.error("Error in indexRepository:", error);
      return {};
    }
  }

  private async getRepoTree(owner: string, repo: string, sha: string) {
    try {
      const { data } = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: sha,
        recursive: "true",
      });
      return data.tree || [];
    } catch (error) {
      console.error("Error in getRepoTree:", error);
      return [];
    }
  }

  private async processTree(owner: string, repo: string, tree: any[]) {
    const codebase: Record<string, string> = {};
    const processedPaths = new Set<string>();

    // Procesar archivos en chunks
    const chunks = this.chunkArray(tree, 5); // Procesar 5 archivos a la vez
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (item) => {
          if (
            item.type === "blob" &&
            this.isCodeFile(item.path) &&
            !processedPaths.has(item.path) &&
            item.size <= this.maxFileSize
          ) {
            try {
              const content = await this.getFileContent(owner, repo, item.path);
              if (content) {
                codebase[item.path] = content;
                processedPaths.add(item.path);
              }
            } catch (error) {
              console.error(`Error processing file ${item.path}:`, error);
            }
          }
        })
      );
      // Pequeña pausa entre chunks para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return codebase;
  }

  private async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in response.data && typeof response.data.content === 'string') {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        // Procesar el contenido en chunks si es muy grande
        if (content.length > this.chunkSize) {
          return this.processLargeContent(content);
        }
        return content;
      }
      return '';
    } catch (error) {
      console.error(`Error fetching content for ${path}:`, error);
      return '';
    }
  }

  private processLargeContent(content: string): string {
    // Dividir el contenido en chunks y procesar solo las partes más relevantes
    const lines = content.split('\n');
    const totalLines = lines.length;
    const maxLines = 1000; // Máximo número de líneas a procesar

    if (totalLines > maxLines) {
      // Tomar el inicio, medio y final del archivo
      const startLines = lines.slice(0, maxLines / 3);
      const midLines = lines.slice(Math.floor(totalLines / 2) - maxLines / 6, Math.floor(totalLines / 2) + maxLines / 6);
      const endLines = lines.slice(totalLines - maxLines / 3);
      
      return [...startLines, ...midLines, ...endLines].join('\n');
    }

    return content;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private isCodeFile(path: string): boolean {
    const extensions = [
      ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go",
      ".rs", ".md", ".json", ".yml", ".yaml", ".css", ".scss",
      ".html", ".xml", ".sh", ".bash", ".sql", ".gitignore",
      ".env.example", ".dockerignore", "Dockerfile", "LICENSE",
      ".cpp", ".c", ".h", ".hpp", ".cs", ".rb", ".php"
    ];
    
    // Si no tiene extensión, verificar si es un archivo especial
    if (!path.includes('.')) {
      const specialFiles = ["Dockerfile", "LICENSE", ".gitignore", ".env.example", ".dockerignore"];
      return specialFiles.some(file => path.endsWith(file));
    }
    
    return extensions.some(ext => path.toLowerCase().endsWith(ext));
  }
}
