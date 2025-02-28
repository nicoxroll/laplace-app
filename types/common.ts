// Tipos base para toda la aplicación
export type RepositoryProvider = "github" | "gitlab";
export type FileType = "file" | "image" | "binary";
export type TreeItemType = "dir" | "file";

// Estados comunes
export type LoadingState = "idle" | "loading" | "success" | "error";
export type VisibilityType = "public" | "private" | "internal";

// Interfaces base para manejo de errores
export interface ApiError {
  message: string;
  code: string;
  status: number;
}

// Interfaces base para respuestas
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
} 