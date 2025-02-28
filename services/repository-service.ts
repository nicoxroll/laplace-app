import {
  Branch,
  Commit,
  RepositoryContext,
  RepositoryFile,
  RepositoryProvider,
} from "@/types/repository";
import { Octokit } from "@octokit/rest";
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

  async fetchBranches(
    repository: Repository,
    token: string
  ): Promise<Branch[]> {
    try {
      if (repository.provider === "gitlab") {
        const response = await fetch(
          `https://gitlab.com/api/v4/projects/${repository.id}/repository/branches`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `GitLab API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        return data.map((branch: any) => ({
          name: branch.name,
          commit: {
            sha: branch.commit.id,
            message: branch.commit.message,
            author: {
              name: branch.commit.author_name,
              date: branch.commit.committed_date,
            },
          },
        }));
      } else {
        const [owner, repo] = repository.full_name.split("/");
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/branches`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `GitHub API error: ${response.status} ${response.statusText}`
          );
        }

        return await response.json();
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
      return [];
    }
  }

  async fetchCommits(
    repository: Repository,
    token: string,
    branch: string
  ): Promise<Commit[]> {
    try {
      if (repository.provider === "gitlab") {
        const response = await fetch(
          `https://gitlab.com/api/v4/projects/${repository.id}/repository/commits?ref_name=${branch}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          return data.map((commit: any) => ({
            sha: commit.id,
            message: commit.title,
            author: {
              name: commit.author_name,
              date: commit.created_at,
            },
          }));
        }
      } else {
        const [owner, repo] = repository.full_name.split("/");
        try {
          // Primero verificamos si el repositorio está vacío
          const repoInfo = await fetch(
            `https://api.github.com/repos/${owner}/${repo}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );

          const repoData = await repoInfo.json();

          if (repoData.size === 0) {
            console.log("Repository is empty");
            return [];
          }

          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );

          if (response.status === 409 || response.status === 404) {
            console.log("Branch does not exist or repository is empty");
            return [];
          }

          if (!response.ok) {
            throw new Error(
              `GitHub API error: ${response.status} ${response.statusText}`
            );
          }

          const data = await response.json();
          return data.map((commit: any) => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: {
              name: commit.commit.author.name,
              date: commit.commit.author.date,
            },
          }));
        } catch (error) {
          console.error("Error fetching commits:", error);
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error("Error in fetchCommits:", error);
      return [];
    }
  }

  public async fetchFileContent(
    repository: Repository,
    accessToken: string,
    path: string,
    ref?: string
  ): Promise<string[]> {
    try {
      if (!repository || !accessToken || !path) {
        throw new Error("Missing required parameters");
      }

      if (repository.provider === "github") {
        const [owner, repo] = repository.full_name.split("/");
        const octokit = new Octokit({ auth: accessToken });

        try {
          // Primer intento: solicitar contenido RAW directamente
          const response = await octokit.repos.getContent({
            owner,
            repo,
            path,
            headers: {
              accept: "application/vnd.github.v3.raw",
            },
          });

          if (typeof response.data === "string") {
            return [response.data];
          }

          throw new Error("Expected string content but got another format");
        } catch (error) {
          // Si falla, intentar el método estándar y manejar base64
          console.log(`Raw fetch failed for ${path}, trying standard method`);

          const response = await octokit.repos.getContent({
            owner,
            repo,
            path,
          });

          // Verificar si la respuesta es un objeto con contenido en base64
          if (
            response.data &&
            "content" in response.data &&
            "encoding" in response.data
          ) {
            const content = response.data.content;
            const encoding = response.data.encoding;

            if (encoding === "base64") {
              return [Buffer.from(content, "base64").toString("utf-8")];
            }
          }

          throw new Error(`Unable to decode content for ${path}`);
        }
      } else if (repository.provider === "gitlab") {
        // Mantener el código existente para GitLab
        const projectId = repository.id;
        const encodedPath = encodeURIComponent(path);

        const response = await fetch(
          `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${repository.default_branch}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch GitLab file: ${response.statusText}`
          );
        }

        return [await response.text()];
      }

      throw new Error(`Unsupported provider: ${repository.provider}`);
    } catch (error) {
      console.error(`Error fetching file content for ${path}:`, error);
      return [
        `Error loading file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      ];
    }
  }

  async fetchFileTree(repo: Repository, accessToken: string): Promise<any[]> {
    if (!repo || !accessToken) return [];

    // Use different strategies based on provider
    if (repo.provider === "github") {
      return this.fetchGitHubFileTree(repo, accessToken);
    } else if (repo.provider === "gitlab") {
      return this.fetchGitLabFileTree(repo, accessToken);
    }

    return [];
  }

  private async fetchGitHubFileTree(
    repo: Repository,
    accessToken: string
  ): Promise<any[]> {
    try {
      console.log("Fetching GitHub file tree using recursive strategy");
      const octokit = new Octokit({ auth: accessToken });

      // Parse repository information
      const [owner, repoName] = repo.full_name.split("/");

      // First, get the default branch reference SHA
      const { data: repoData } = await octokit.repos.get({
        owner,
        repo: repoName,
      });

      const defaultBranch = repoData.default_branch || "main";

      // Get the reference SHA
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${defaultBranch}`,
      });

      const commitSha = refData.object.sha;

      // Get the complete tree recursively in ONE API call - this is key!
      const { data: treeData } = await octokit.git.getTree({
        owner,
        repo: repoName,
        tree_sha: commitSha,
        recursive: "true", // Esta es la parte crucial que recupera todo el árbol
      });

      if (treeData.truncated) {
        console.warn(
          "⚠️ GitHub tree response was truncated - repository might be too large"
        );
      }

      // Process the tree into the format expected by your application
      return this.processGitHubTree(treeData.tree);
    } catch (error) {
      console.error("Error fetching GitHub file tree:", error);
      return [];
    }
  }

  private processGitHubTree(tree: any[]): any[] {
    // First, organize items by path
    const fileMap = new Map();
    const rootItems = [];

    // Sort items so directories come before files
    tree.sort((a, b) => {
      const aIsBlob = a.type === "blob";
      const bIsBlob = b.type === "blob";
      if (aIsBlob && !bIsBlob) return 1;
      if (!aIsBlob && bIsBlob) return -1;
      return a.path.localeCompare(b.path);
    });

    // Process each tree item
    tree.forEach((item) => {
      const path = item.path;
      const parts = path.split("/");
      const name = parts[parts.length - 1];

      // Create item object
      const treeItem = {
        name,
        path,
        type: item.type === "blob" ? "file" : "dir",
        sha: item.sha,
        size: item.size,
        children: item.type === "tree" ? [] : undefined,
      };

      // Add to map for lookup
      fileMap.set(path, treeItem);

      // If this is a top-level item, add to rootItems
      if (parts.length === 1) {
        rootItems.push(treeItem);
      } else {
        // This is a nested item - find parent directory
        const parentPath = parts.slice(0, -1).join("/");
        const parentItem = fileMap.get(parentPath);

        // Add to parent's children if parent exists
        if (parentItem && parentItem.children) {
          parentItem.children.push(treeItem);
        }
      }
    });

    return rootItems;
  }

  private async fetchGitLabFileTree(
    repo: Repository,
    accessToken: string
  ): Promise<any[]> {
    // Keep existing GitLab implementation
    try {
      console.log("Fetching GitLab file tree");
      const projectId = repo.id;

      const response = await fetch(
        `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?recursive=true&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch GitLab tree: ${response.statusText}`);
      }

      const items = await response.json();
      return this.processGitLabTree(items);
    } catch (error) {
      console.error("Error fetching GitLab file tree:", error);
      return [];
    }
  }

  private processGitLabTree(items: any[]): any[] {
    // Similar processing for GitLab items
    const fileMap = new Map();
    const rootItems = [];

    items.sort((a, b) => {
      if (a.type === "tree" && b.type === "blob") return -1;
      if (a.type === "blob" && b.type === "tree") return 1;
      return a.path.localeCompare(b.path);
    });

    items.forEach((item) => {
      const path = item.path;
      const parts = path.split("/");
      const name = parts[parts.length - 1];

      const treeItem = {
        name,
        path,
        type: item.type === "blob" ? "file" : "dir",
        id: item.id,
        children: item.type === "tree" ? [] : undefined,
      };

      fileMap.set(path, treeItem);

      if (parts.length === 1) {
        rootItems.push(treeItem);
      } else {
        const parentPath = parts.slice(0, -1).join("/");
        const parentItem = fileMap.get(parentPath);

        if (parentItem && parentItem.children) {
          parentItem.children.push(treeItem);
        }
      }
    });

    return rootItems;
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
