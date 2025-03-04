// hooks/useRepositories.ts
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Repository, fetchRepositories } from "@/services/repository-service";

export function useRepositories() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    if (!session?.user?.accessToken) {
      setRepositories([]);
      setLoadingRepos(false);
      return;
    }

    try {
      setLoadingRepos(true);
      setError(null);

      // Usar la función de repository-service en lugar de KnowledgeService
      const repos = await fetchRepositories(session);
      setRepositories(repos);
    } catch (err) {
      console.error("Error fetching repositories:", err);
      setError(
        err instanceof Error ? err.message : "Error cargando repositorios"
      );

      // Fallback data para desarrollo
      setRepositories([
        {
          id: "1",
          name: "example-repo",
          full_name: "user/example-repo",
          description: "Repositorio predeterminado",
          private: false,
          provider: "github", 
          html_url: "https://github.com/user/example-repo",
          default_branch: "main"
        },
        {
          id: "2",
          name: "documentation",
          full_name: "user/documentation",
          description: "Documentación técnica",
          private: false,
          provider: "github",
          html_url: "https://github.com/user/documentation",
          default_branch: "main"
        },
      ]);
    } finally {
      setLoadingRepos(false);
    }
  }, [session]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  return {
    repositories,
    loadingRepos,
    fetchRepositories: fetchRepos,
    error: error,
  };
}

// No necesitamos exportar la interfaz Repository, ya que la importamos de repository-service
