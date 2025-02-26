import {
  RepositoryContext,
  RepositoryFile,
  RepositoryProvider,
} from "@/types/repository";
import { Session } from "next-auth";
import {
  GitHubRepository,
  GitLabRepository,
  Repository,
} from "../types/repository";
export class RepositoryService {
  private static instance: RepositoryService;
  private context: RepositoryContext | null = null;
  private listeners: Set<(context: RepositoryContext | null) => void> =
    new Set();

  private constructor() {}

  static getInstance(): RepositoryService {
    if (!RepositoryService.instance) {
      RepositoryService.instance = new RepositoryService();
    }
    return RepositoryService.instance;
  }

  async initializeRepository(
    provider: RepositoryProvider,
    repoFullName: string,
    token: string
  ): Promise<void> {
    try {
      const repoInfo = await this.fetchRepositoryInfo(
        provider,
        repoFullName,
        token
      );
      const files = await this.fetchRepositoryFiles(
        provider,
        repoFullName,
        token
      );

      this.context = {
        provider,
        repository: repoInfo,
        currentPath: "",
        files,
        currentFile: undefined,
      };

      this.notifyListeners();
    } catch (error) {
      console.error("Error initializing repository:", error);
      throw error;
    }
  }

  private async fetchRepositoryInfo(
    provider: RepositoryProvider,
    repoFullName: string,
    token: string
  ) {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept:
        provider === "github"
          ? "application/vnd.github.v3+json"
          : "application/json",
    };

    const baseUrl =
      provider === "github"
        ? "https://api.github.com/repos"
        : "https://gitlab.com/api/v4/projects";

    const response = await fetch(
      provider === "github"
        ? `${baseUrl}/${repoFullName}`
        : `${baseUrl}/${encodeURIComponent(repoFullName)}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch repository info: ${response.statusText}`
      );
    }

    return await response.json();
  }

  private async fetchRepositoryFiles(
    provider: RepositoryProvider,
    repoFullName: string,
    token: string,
    path: string = ""
  ): Promise<RepositoryFile[]> {
    // Implementación según el proveedor
    return provider === "github"
      ? this.fetchGitHubFiles(repoFullName, token, path)
      : this.fetchGitLabFiles(repoFullName, token, path);
  }

  subscribe(listener: (context: RepositoryContext | null) => void): () => void {
    this.listeners.add(listener);
    if (this.context) {
      listener(this.context);
    }
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.context));
  }

  getContext(): RepositoryContext | null {
    return this.context;
  }

  async setCurrentFile(path: string): Promise<void> {
    if (!this.context) return;

    const fileContent = await this.fetchFileContent(
      this.context.provider,
      this.context.repository.full_name,
      path
    );

    this.context = {
      ...this.context,
      currentPath: path,
      currentFile: {
        name: path.split("/").pop() || "",
        path,
        content: fileContent.split("\n"),
        language: path.split(".").pop(),
      },
    };

    this.notifyListeners();
  }

  async fetchRepositories(session: Session): Promise<Repository[]> {
    if (!session?.user?.accessToken) {
      throw new Error("No authentication token available");
    }

    try {
      // Verificar el provider de la sesión
      const provider = session.user?.provider || session.provider;

      // Fetch repos based on the provider
      if (provider === "github") {
        const githubRepos = await this.fetchGitHubRepositories(
          session.user.accessToken
        );
        return githubRepos;
      } else if (provider === "gitlab") {
        const gitlabRepos = await this.fetchGitLabRepositories(
          session.user.accessToken
        );
        return gitlabRepos;
      }

      // Si tenemos ambos tokens, intentar obtener de ambos providers
      if (session.user.accessToken) {
        const [githubRepos, gitlabRepos] = await Promise.all([
          this.fetchGitHubRepositories(session.user.accessToken).catch(
            () => []
          ),
          this.fetchGitLabRepositories(session.user.accessToken).catch(
            () => []
          ),
        ]);

        return [...githubRepos, ...gitlabRepos];
      }

      return [];
    } catch (error) {
      console.error("Error fetching repositories:", error);
      return []; // Retornar array vacío en lugar de lanzar error
    }
  }

  private async fetchGitHubRepositories(
    token: string
  ): Promise<GitHubRepository[]> {
    try {
      const response = await fetch("https://api.github.com/user/repos", {
        headers: {
          Authorization: `token ${token}`, // Cambiado de Bearer a token
          Accept: "application/vnd.github+json",
        },
      });

      if (!response.ok) {
        console.error(
          `GitHub API error: ${response.status} - ${response.statusText}`
        );
        return [];
      }

      const data = await response.json();
      return data.map(
        (repo: any): GitHubRepository => ({
          id: repo.id.toString(),
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          provider: "github",
          owner: {
            login: repo.owner.login,
            avatar_url: repo.owner.avatar_url,
          },
          default_branch: repo.default_branch,
        })
      );
    } catch (error) {
      console.error("GitHub fetch error:", error);
      return [];
    }
  }

  private async fetchGitLabRepositories(
    token: string
  ): Promise<GitLabRepository[]> {
    try {
      console.log(
        "Iniciando fetch de GitLab repos con token:",
        token.slice(0, 10) + "..."
      );

      const url =
        "https://gitlab.com/api/v4/projects?" +
        new URLSearchParams({
          membership: "true",
          per_page: "100",
          simple: "true",
        }).toString();

      console.log("URL de la petición:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      console.log(
        "Estado de la respuesta:",
        response.status,
        response.statusText
      );

      const responseText = await response.text();
      console.log("Respuesta completa:", responseText);

      if (!response.ok) {
        console.error("Error en la respuesta de GitLab:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
        });
        return [];
      }

      const data = JSON.parse(responseText);
      console.log("Datos parseados:", data);

      if (!Array.isArray(data)) {
        console.error("GitLab API retornó formato inválido:", typeof data);
        return [];
      }

      const mappedRepos = data.map((repo: any): GitLabRepository => {
        console.log("Procesando repo:", {
          id: repo.id,
          name: repo.name,
          path_with_namespace: repo.path_with_namespace,
          visibility: repo.visibility,
        });

        return {
          id: repo.id.toString(),
          name: repo.name,
          full_name: repo.path_with_namespace,
          provider: "gitlab",
          html_url: repo.web_url,
          description: repo.description || "",
          private: repo.visibility !== "public",
          default_branch: repo.default_branch || "main",
          owner: {
            login: repo.namespace?.path || "",
            avatar_url: repo.namespace?.avatar_url || "",
          },
          namespace: {
            name: repo.namespace?.name || "",
            avatar_url: repo.namespace?.avatar_url || "",
          },
        };
      });

      console.log("Repos procesados:", mappedRepos.length);
      return mappedRepos;
    } catch (error) {
      console.error("Error detallado en GitLab fetch:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  }
}

export async function fetchRepositories(
  session: Session
): Promise<Repository[]> {
  if (!session?.accessToken || !session?.provider) {
    throw new Error("No authentication token available");
  }

  try {
    switch (session.provider) {
      case "github":
        return await fetchGitHubRepositories(session.accessToken);
      case "gitlab":
        return await fetchGitLabRepositories(session.accessToken);
      default:
        throw new Error(`Unsupported provider: ${session.provider}`);
    }
  } catch (error) {
    console.error("Error fetching repositories:", error);
    throw error;
  }
}

async function fetchGitHubRepositories(
  token: string
): Promise<GitHubRepository[]> {
  const response = await fetch("https://api.github.com/user/repos", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = await response.json();

  return data.map(
    (repo: any): GitHubRepository => ({
      id: repo.id.toString(),
      name: repo.name,
      full_name: repo.full_name,
      provider: "github",
      html_url: repo.html_url,
      description: repo.description || undefined,
      private: repo.private,
      default_branch: repo.default_branch,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url,
      },
    })
  );
}

async function fetchGitLabRepositories(
  token: string
): Promise<GitLabRepository[]> {
  const response = await fetch(
    "https://gitlab.com/api/v4/projects?membership=true",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  const data = await response.json();

  return data.map(
    (repo: any): GitLabRepository => ({
      id: repo.id.toString(),
      name: repo.name,
      full_name: repo.path_with_namespace,
      provider: "gitlab",
      html_url: repo.web_url,
      description: repo.description || undefined,
      private: !repo.public,
      default_branch: repo.default_branch,
      namespace: {
        name: repo.namespace.name,
        avatar_url: repo.namespace.avatar_url,
      },
    })
  );
}

export async function getRepository(
  session: Session,
  repoFullName: string
): Promise<Repository | null> {
  if (!session?.accessToken || !session?.provider) {
    throw new Error("No authentication token available");
  }

  try {
    switch (session.provider) {
      case "github":
        const [owner, repo] = repoFullName.split("/");
        const githubResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              Accept: "application/vnd.github+json",
            },
          }
        );

        if (!githubResponse.ok) return null;

        const githubData = await githubResponse.json();
        return {
          id: githubData.id.toString(),
          name: githubData.name,
          full_name: githubData.full_name,
          provider: "github",
          html_url: githubData.html_url,
          description: githubData.description || undefined,
          private: githubData.private,
          default_branch: githubData.default_branch,
          owner: {
            login: githubData.owner.login,
            avatar_url: githubData.owner.avatar_url,
          },
        };

      case "gitlab":
        const gitlabResponse = await fetch(
          `https://gitlab.com/api/v4/projects/${encodeURIComponent(
            repoFullName
          )}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );

        if (!gitlabResponse.ok) return null;

        const gitlabData = await gitlabResponse.json();
        return {
          id: gitlabData.id.toString(),
          name: gitlabData.name,
          full_name: gitlabData.path_with_namespace,
          provider: "gitlab",
          html_url: gitlabData.web_url,
          description: gitlabData.description || undefined,
          private: !gitlabData.public,
          default_branch: gitlabData.default_branch,
          namespace: {
            name: gitlabData.namespace.name,
            avatar_url: gitlabData.namespace.avatar_url,
          },
        };

      default:
        return null;
    }
  } catch (error) {
    console.error("Error fetching repository:", error);
    return null;
  }
}
