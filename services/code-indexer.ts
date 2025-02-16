// services/code-indexer.ts
import { Octokit } from "octokit";

export class CodeIndexer {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async indexRepository(repoFullName: string) {
    const [owner, repo] = repoFullName.split("/");
    const tree = await this.getRepoTree(owner, repo);
    return this.processTree(owner, repo, tree);
  }

  private async getRepoTree(owner: string, repo: string) {
    const { data } = await this.octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: "HEAD",
      recursive: "true",
    });
    return data.tree;
  }

  private async processTree(owner: string, repo: string, tree: any[]) {
    const codebase: Record<string, string> = {};

    for (const item of tree) {
      if (item.type === "blob" && this.isCodeFile(item.path)) {
        const content = await this.getFileContent(owner, repo, item.path);
        codebase[item.path] = content;
      }
    }

    return codebase;
  }

  private async getFileContent(owner: string, repo: string, path: string) {
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if ("content" in data) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return "";
  }

  private isCodeFile(path: string): boolean {
    const extensions = [".ts", ".js", ".py", ".java", ".go", ".rs", ".md"];
    return extensions.some((ext) => path.endsWith(ext));
  }
}
