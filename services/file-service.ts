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
        const cleanContent = content.replace(/\s/g, "");
        return Buffer.from(cleanContent, "base64").toString("utf-8");
      } catch (error) {
        console.error("Error decoding base64 content:", error);
        return "Error decoding file content";
      }
    }
    return content;
  }

  processFileContent(content: string[], encoding?: string): string {
    try {
      // Si el contenido es un string JSON, intentamos parsearlo
      if (content.length === 1 && typeof content[0] === "string") {
        try {
          // Para GitLab
          const jsonContent = JSON.parse(content[0]);

          // GitLab devuelve el contenido en la propiedad 'content'
          if (jsonContent.content) {
            if (jsonContent.encoding === "base64") {
              return this.decodeContent(jsonContent.content, "base64");
            }
            return jsonContent.content;
          }
        } catch (e) {
          console.log("No es un JSON válido o no tiene el formato esperado");
        }
      }

      // Si es contenido base64 directo
      if (encoding === "base64") {
        return this.decodeContent(content.join(""), "base64");
      }

      // Si es contenido plano
      return content.join("\n");
    } catch (error) {
      console.error("Error processing file content:", error);
      return String(content);
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
    if (!file) {
      throw new Error("File is required");
    }

    const fileType = this.getFileType(file.name);
    let content = "";

    if (file.content && file.encoding === "base64" && fileType === "file") {
      try {
        content = this.decodeContent(file.content, file.encoding);
      } catch (error) {
        console.error("Error processing file content:", error);
        content = "Error processing file content";
      }
    }

    return {
      name: file.name || "",
      path: file.path || "",
      type: fileType,
      content: content || undefined,
      url: file.html_url,
      raw_url:
        fileType === "image"
          ? this.getRawUrl(repository, file.path)
          : undefined,
      encoding: file.encoding,
      size: file.size,
    };
  }
}
