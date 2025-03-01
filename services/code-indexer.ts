import { Octokit } from "@octokit/rest";

export class CodeIndexer {
  public codebase: Record<string, any> = {};
  private progressCallback?: (progress: number) => void;
  private accessToken: string;
  public provider: string = "github"; // Default to GitHub
  private lastReportedProgress: number = 0; // Track last reported progress

  constructor(token: string) {
    this.accessToken = token;
  }

  onProgress(callback: (progress: number) => void) {
    this.progressCallback = callback;
  }

  // Add a new method to safely update progress
  private updateProgress(current: number, total: number) {
    // Calculate current percentage
    const percentage = Math.min(current / total, 1.0);

    // Only update if it's higher than what we last reported
    if (percentage > this.lastReportedProgress) {
      this.lastReportedProgress = percentage;
      this.progressCallback?.(percentage);
    }
  }

  async indexRepository(
    repoFullName: string,
    provider: string = "github"
  ): Promise<Record<string, any>> {
    try {
      this.provider = provider;
      console.log(`Indexing ${provider} repository: ${repoFullName}`);

      this.codebase = {}; // Reset any previous indexing

      // Completely separate code paths for different providers
      if (provider === "github") {
        return await this.indexGitHubRepository(repoFullName);
      } else if (provider === "gitlab") {
        return await this.indexGitLabRepository(repoFullName);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Error indexing ${provider} repository:`, error);
      throw error;
    }
  }

  // GitHub implementation using Octokit
  private async indexGitHubRepository(
    repoFullName: string
  ): Promise<Record<string, any>> {
    try {
      // Reset progress tracking for new repository
      this.lastReportedProgress = 0;

      // Create new Octokit instance for GitHub only
      const octokit = new Octokit({
        auth: this.accessToken,
      });

      const [owner, repo] = repoFullName.split("/");
      console.log(`Starting GitHub indexing for ${owner}/${repo}`);

      // Get repo info using GitHub API
      const repoInfo = await octokit.rest.repos.get({ owner, repo });
      const defaultBranch = repoInfo.data.default_branch || "main";

      // Get ref data
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });

      if (!refData.object?.sha) {
        throw new Error("Could not get repository reference");
      }

      // Get tree
      const { data } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: refData.object.sha,
        recursive: "true",
      });

      const tree = data.tree || [];
      const codeFiles = tree.filter(
        (item): item is { type: string; path: string } =>
          typeof item.path === "string" && this.isCodeFile(item.path)
      );
      const totalFiles = codeFiles.length;

      if (totalFiles === 0) {
        throw new Error("No indexable files found");
      }

      console.log(
        `Found ${totalFiles} code files to index in GitHub repository`
      );

      // Process files in batches
      const codebase: Record<string, string> = {};
      let filesProcessed = 0;

      const batchSize = 5;
      for (let i = 0; i < codeFiles.length; i += batchSize) {
        const batch = codeFiles.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (file) => {
            try {
              if (file.type === "blob") {
                const response = await this.getGitHubFileContent(
                  owner,
                  repo,
                  file.path
                );

                if (response) {
                  codebase[file.path] = this.processFileContent(
                    file.path,
                    response
                  );
                }
              }
            } catch (error) {
              console.warn(`Error processing file ${file.path}:`, error);
            } finally {
              filesProcessed++;
              // Use the new updateProgress method
              this.updateProgress(filesProcessed, totalFiles);
            }
          })
        );

        // Add a small delay between batches to avoid rate limits
        if (i + batchSize < codeFiles.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Ensure we report 100% when done
      this.updateProgress(totalFiles, totalFiles);

      this.codebase = codebase;
      return codebase;
    } catch (error) {
      console.error("Error in indexGitHubRepository:", error);
      throw error;
    }
  }

  // GitLab implementation - uses fetch API instead of Octokit
  private async indexGitLabRepository(
    repoFullName: string
  ): Promise<Record<string, any>> {
    try {
      // Reset progress tracking for new repository
      this.lastReportedProgress = 0;

      if (!this.accessToken) {
        throw new Error("GitLab access token is required");
      }

      console.log(`Starting GitLab indexing for ${repoFullName}`);

      // First, get the repository ID if we have the full name
      const encodedRepo = encodeURIComponent(repoFullName);
      let projectId: string;

      // Check if it's already a numeric ID
      if (/^\d+$/.test(repoFullName)) {
        projectId = repoFullName;
        console.log(`Using provided numeric project ID: ${projectId}`);
      } else {
        // Fetch project ID from name
        console.log(`Fetching project ID for: ${repoFullName}`);
        const projectResponse = await fetch(
          `https://gitlab.com/api/v4/projects/${encodedRepo}`,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!projectResponse.ok) {
          const errorBody = await projectResponse
            .text()
            .catch(() => "No error body");
          throw new Error(
            `Failed to get GitLab project (${projectResponse.status}): ${projectResponse.statusText}\nDetails: ${errorBody}`
          );
        }

        const projectData = await projectResponse.json();
        projectId = projectData.id.toString();
        console.log(`Retrieved project ID: ${projectId}`);
      }

      // Get default branch
      console.log(`Fetching repository info for project ${projectId}`);
      const repoInfoResponse = await fetch(
        `https://gitlab.com/api/v4/projects/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!repoInfoResponse.ok) {
        const errorBody = await repoInfoResponse
          .text()
          .catch(() => "No error body");
        throw new Error(
          `Failed to get GitLab project info (${repoInfoResponse.status}): ${repoInfoResponse.statusText}\nDetails: ${errorBody}`
        );
      }

      const repoInfo = await repoInfoResponse.json();
      const defaultBranch = repoInfo.default_branch || "main";

      // Get repository tree using GitLab API
      console.log(
        `Getting tree for GitLab project ${projectId}, branch ${defaultBranch}`
      );
      let allFiles: any[] = [];

      // Function to recursively fetch directory contents
      const fetchDirectory = async (path: string = ""): Promise<void> => {
        try {
          const encodedPath = path ? encodeURIComponent(path) : "";
          const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?path=${encodedPath}&ref=${defaultBranch}&per_page=100`;

          console.log(`Fetching GitLab directory: ${url}`);

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorBody = await response
              .text()
              .catch(() => "No error body");
            console.error(`GitLab API Error:`, {
              status: response.status,
              statusText: response.statusText,
              url: url,
              errorBody,
            });

            // Si es un error 404, podría ser un archivo en lugar de un directorio
            if (response.status === 404) {
              console.log(
                `Path ${path} not found, might be a file or invalid path`
              );
              return;
            }

            throw new Error(
              `Failed to fetch GitLab directory (${response.status}): ${response.statusText}`
            );
          }

          const items = await response.json();

          if (!Array.isArray(items)) {
            console.warn(`Unexpected response format for path ${path}:`, items);
            return;
          }

          for (const item of items) {
            const itemPath = path ? `${path}/${item.name}` : item.name;

            if (item.type === "tree") {
              // Agregamos un pequeño delay entre llamadas recursivas para evitar rate limits
              await new Promise((resolve) => setTimeout(resolve, 100));
              await fetchDirectory(itemPath);
            } else if (item.type === "blob") {
              allFiles.push({
                type: "blob",
                path: itemPath,
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching directory ${path}:`, error);
          // No relanzamos el error para permitir que continúe con otros directorios
        }
      };

      // Start recursive fetching
      await fetchDirectory();

      // Filter to only include code files
      const codeFiles = allFiles.filter((item) => this.isCodeFile(item.path));

      if (codeFiles.length === 0) {
        console.warn("No indexable files found in GitLab repository");
        this.codebase = {};
        return {};
      }

      console.log(
        `Found ${codeFiles.length} code files to index in GitLab repository`
      );

      // Process files in batches
      const codebase: Record<string, string> = {};
      let filesProcessed = 0;

      const batchSize = 5;
      for (let i = 0; i < codeFiles.length; i += batchSize) {
        const batch = codeFiles.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (file) => {
            try {
              const encodedPath = encodeURIComponent(file.path);
              const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${defaultBranch}`;

              const response = await fetch(url, {
                headers: {
                  Authorization: `Bearer ${this.accessToken}`,
                  "Content-Type": "application/json",
                },
              });

              if (response.ok) {
                codebase[file.path] = this.processFileContent(
                  file.path,
                  await response.text()
                );
              } else {
                console.warn(
                  `Error fetching GitLab file ${file.path} (${response.status}): ${response.statusText}`
                );
              }
            } catch (error) {
              console.warn(`Error fetching GitLab file ${file.path}:`, error);
            } finally {
              filesProcessed++;
              // Use the new updateProgress method
              this.updateProgress(filesProcessed, codeFiles.length);
            }
          })
        );

        // Add a small delay between batches to avoid rate limits
        if (i + batchSize < codeFiles.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Ensure we report 100% when done
      this.updateProgress(codeFiles.length, codeFiles.length);

      console.log(`Finished indexing ${filesProcessed} files`);
      this.codebase = codebase;
      return codebase;
    } catch (error) {
      console.error("Error in indexGitLabRepository:", error);
      throw error;
    }
  }

  // Common utility method - REVISE THIS
  private isCodeFile(path: string): boolean {
    // Binary files to exclude
    const excludedExtensions = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "ico",
      "svg",
      "wav",
      "mp3",
      "css",
      "scss",
      "flac",
      "mp4",
      "avi",
      "mov",
      "flv",
      "mkv",
      "pdf",
      "zip",
      "tar",
      "gz",
      "rar",
      "exe",
      "dll",
      "so",
      "o",
      "ttf",
      "woff",
      "woff2",
      "eot",
    ];

    // These paths should be excluded
    const excludedPaths = ["node_modules/", "dist/", "build/", ".git/"];

    // Check if path contains any excluded directory
    if (excludedPaths.some((excluded) => path.includes(excluded))) {
      return false;
    }

    // Check if file has any excluded extension
    if (
      excludedExtensions.some((ext) => path.toLowerCase().endsWith(`.${ext}`))
    ) {
      return false;
    }

    // Incluir todos los demás archivos
    return true;
  }

  // Add a method to handle large files by truncating them
  private processFileContent(path: string, content: string): string {
    // Define size limits based on file type
    const MAX_FILE_SIZE = 500000; // 500KB general limit
    const MAX_CONFIG_SIZE = 1000000; // 1MB for config files

    if (!content) return "";

    // Determine if this is a config file
    const isConfigFile = [
      ".json",
      ".yml",
      ".yaml",
      ".xml",
      ".config",
      ".env",
    ].some((ext) => path.toLowerCase().endsWith(ext));

    const maxSize = isConfigFile ? MAX_CONFIG_SIZE : MAX_FILE_SIZE;

    // Truncate if too large
    if (content.length > maxSize) {
      return (
        content.substring(0, maxSize) +
        `\n\n// ... content truncated (${(content.length / 1024).toFixed(
          1
        )}KB total) ...\n`
      );
    }

    return content;
  }

  // En el método getGitHubFileContent de la clase CodeIndexer
  private async getGitHubFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string> {
    try {
      const octokit = new Octokit({
        auth: this.accessToken,
      });

      try {
        // Primero intenta obtener el contenido RAW
        const response = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          headers: {
            accept: "application/vnd.github.v3.raw",
          },
        });

        // Si la respuesta es una cadena directamente, devuélvela
        if (typeof response.data === "string") {
          return response.data;
        }

        throw new Error("Expected raw content but got another format");
      } catch (error) {
        // Si falla, intenta el método estándar para manejar contenido base64
        console.log(
          `Raw fetch failed for ${path}, trying with base64 handling`
        );

        const response = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
        });

        // Verificar si es un objeto con contenido codificado en base64
        if (
          response.data &&
          "content" in response.data &&
          "encoding" in response.data
        ) {
          const { content, encoding } = response.data as {
            content: string;
            encoding: string;
          };

          if (encoding === "base64") {
            return Buffer.from(content, "base64").toString("utf-8");
          }
        }

        console.warn(`Unexpected response format for file: ${path}`);
        return "";
      }
    } catch (error) {
      console.error(`Error fetching content for ${path}:`, error);
      return "";
    }
  }

  public getProvider(): string {
    return this.provider;
  }
}
