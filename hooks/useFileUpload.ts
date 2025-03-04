// hooks/useFileUpload.ts
import { KnowledgeService } from "@/services/knowledge-service";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";

export function useFileUpload(onError: (message: string) => void) {
  const { data: session } = useSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isIndexed, setIsIndexed] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const knowledgeService = KnowledgeService.getInstance();

  // Function to handle file selection
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    updateNameDescription?: (filename: string, filesize: number) => void
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setIsIndexed(false);

      // If a callback to update name/description was provided, call it
      if (updateNameDescription) {
        updateNameDescription(
          file.name.split(".")[0],
          parseFloat((file.size / 1024).toFixed(2))
        );
      }
    }
  };

  // Clear the selected file
  const handleClearFile = () => {
    setSelectedFile(null);
    setIsIndexed(false);
    setIndexProgress(0);
    setJobId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload and index file
  const uploadAndIndexFile = async (): Promise<{
    success: boolean;
    jobId: string | null;
  }> => {
    if (!selectedFile || !session?.user?.accessToken) {
      return { success: false, jobId: null };
    }

    try {
      setIsIndexing(true);
      setIndexProgress(0);

      const provider = session.user.provider || "github";
      const jwtToken = await knowledgeService.exchangeToken(
        session.user.accessToken,
        provider
      );

      // Create FormData for upload
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Upload file to backend
      const response = await fetch(
        `${knowledgeService.baseUrl}/api/knowledge/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en la carga: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("Respuesta de indexación:", data);
      setJobId(data.job_id);

      // Wait for indexing to complete
      let indexCompleted = false;

      while (!indexCompleted) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const statusResponse = await fetch(
          `${knowledgeService.baseUrl}/api/knowledge/job/${data.job_id}/status`,
          {
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!statusResponse.ok) {
          throw new Error(
            `Error al verificar estado: ${statusResponse.status}`
          );
        }

        const statusData = await statusResponse.json();

        if (statusData.progress) {
          setIndexProgress(statusData.progress * 100);
        }

        if (statusData.status === "completed") {
          setIsIndexed(true);
          indexCompleted = true;
        } else if (statusData.status === "failed") {
          throw new Error(statusData.message || "La indexación falló");
        }
      }

      return { success: true, jobId: data.job_id };
    } catch (error) {
      console.error("Error indexando archivo:", error);
      onError(
        error instanceof Error ? error.message : "Error indexando archivo"
      );
      return { success: false, jobId: null };
    } finally {
      setIsIndexing(false);
    }
  };

  return {
    selectedFile,
    isIndexing,
    isIndexed,
    indexProgress,
    jobId,
    fileInputRef,
    handleFileChange,
    handleClearFile,
    uploadAndIndexFile,
  };
}
