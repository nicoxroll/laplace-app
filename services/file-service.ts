import { FileType, Repository, RepositoryFile } from "@/types/repository";

export class FileService {
  private static instance: FileService;

  private constructor() {}

  static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  isImage(filename: string | undefined): boolean {
    if (!filename) return false;

    const imageExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".webp",
      ".svg",
      ".bmp",
    ];
    return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  }

  getImageUrl(repository: Repository, path: string): string {
    if (!repository || !path) return "";
    const branch = repository.default_branch || "main";
    return `https://raw.githubusercontent.com/${
      repository.full_name
    }/${branch}/${encodeURIComponent(path)}`;
  }

  decodeContent(content: string, encoding: string = "utf-8"): string {
    if (encoding === "base64") {
      try {
        // Limpiamos el contenido base64 de posibles espacios o saltos de línea
        const cleanContent = content.replace(/[\n\r\s]/g, "");
        
        // Decodificamos el contenido
        const decoded = Buffer.from(cleanContent, "base64").toString("utf-8");
        
        // Verificamos si el contenido decodificado es JSON
        try {
          const jsonContent = JSON.parse(decoded);
          return JSON.stringify(jsonContent, null, 2);
        } catch {
          // Si no es JSON, retornamos el contenido decodificado directamente
          return decoded;
        }
      } catch (error) {
        console.error("Error decoding base64 content:", error);
        return "Error decoding file content";
      }
    }
    return content;
  }

  processFileContent(content: any, encoding?: string): string {
    try {
      // Si es un array, lo unimos con saltos de línea
      if (Array.isArray(content)) {
        return content.join("\n");
      }

      // Si es un string directo, lo retornamos
      if (typeof content === "string") {
        return content;
      }

      // Si es un objeto (respuesta de GitHub/GitLab)
      if (typeof content === "object") {
        // Caso GitHub
        if (content.content && content.encoding === "base64") {
          return this.decodeContent(content.content, "base64");
        }

        // Si tenemos un objeto con contenido directo
        if (content.content) {
          return content.content;
        }

        // Si el objeto completo es el contenido
        return JSON.stringify(content, null, 2);
      }

      return String(content);
    } catch (error) {
      console.error("Error processing file content:", error);
      return "Error processing file content";
    }
  }

  isBinary(filename: string | undefined): boolean {
    if (!filename) return false;

    const binaryExtensions = [".pdf", ".zip", ".exe", ".dll"];
    return binaryExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  }

  getFileType(filename: string | undefined): FileType {
    if (!filename) return "file";
    if (this.isImage(filename)) return "image";
    if (this.isBinary(filename)) return "binary";
    return "file";
  }

  getRawUrl(
    repository: Repository | undefined,
    path: string | undefined,
    branch: string = "master"
  ): string {
    if (!repository || !path) return "";
    if (repository.provider === "gitlab") {
      return `https://gitlab.com/api/v4/projects/${
        repository.id
      }/repository/files/${encodeURIComponent(path)}/raw`;
    }
    return `https://raw.githubusercontent.com/${repository.full_name}/${branch}/${path}`;
  }

  async processFile(
    file: any,
    repository: Repository
  ): Promise<RepositoryFile> {
    const processedContent = this.processFileContent(file.content, file.encoding);
    
    return {
      name: file.name,
      path: file.path,
      size: file.size,
      url: file.url,
      content: processedContent,
      encoding: file.encoding,
      type: this.getFileType(file.path)
    };
  }
}
