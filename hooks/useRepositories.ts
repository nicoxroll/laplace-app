// hooks/useRepositories.ts
import { KnowledgeService } from "@/services/knowledge-service";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

export interface Repository {
  id: number;
  name: string;
  description?: string;
}

export function useRepositories() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const knowledgeService = KnowledgeService.getInstance();

  const fetchRepositories = useCallback(async () => {
    if (!session?.user?.accessToken) {
      setRepositories([]);
      setLoadingRepos(false);
      return;
    }

    try {
      setLoadingRepos(true);
      setError(null);

      const provider = session.user.provider || "github";
      const jwtToken = await knowledgeService.exchangeToken(
        session.user.accessToken,
        provider
      );

      // Ajusta esta llamada al servicio según tu API
      const data = await knowledgeService.getRepositories(`Bearer ${jwtToken}`);
      setRepositories(data);
    } catch (err) {
      console.error("Error fetching repositories:", err);
      setError(
        err instanceof Error ? err.message : "Error cargando repositorios"
      );

      // Fallback data para desarrollo
      setRepositories([
        {
          id: 1,
          name: "Repositorio General",
          description: "Repositorio predeterminado",
        },
        {
          id: 2,
          name: "Documentación Técnica",
          description: "Para documentos técnicos",
        },
        {
          id: 3,
          name: "Manuales de Usuario",
          description: "Guías para usuarios finales",
        },
      ]);
    } finally {
      setLoadingRepos(false);
    }
  }, [session, knowledgeService]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  return {
    repositories,
    loadingRepos,
    fetchRepositories,
    error: error,
  };
}
