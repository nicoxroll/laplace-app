"use client";

import { useRepository } from "@/contexts/repository-context";
import { ChatService } from "@/services/chat-service";
import { RepositoryService } from "@/services/repository-service";
import type { Repository } from "@/types/repository";
import { GitHub } from "@mui/icons-material";
import {
  Box,
  InputAdornment,
  ListItemButton,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Gitlab, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const StyledTextField = styled(TextField)({
  width: "100%",
  "& .MuiInputBase-root": {
    color: "#e6edf3",
    backgroundColor: "#161b22",
    height: "36px",
    fontSize: "0.875rem",
    borderRadius: 0,
    border: "none",
    borderBottom: "1px solid #30363d",
    "&:hover": {
      backgroundColor: "#1c2129",
    },
    "&.Mui-focused": {
      backgroundColor: "#1c2129",
    },
  },
  "& .MuiOutlinedInput-notchedOutline": {
    border: "none",
  },
  "& .MuiInputBase-input": {
    padding: "8px 12px",
  },
  "& .MuiInputAdornment-root": {
    color: "#8b949e",
    marginLeft: "12px",
  },
});

export function RepositoryList() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const { selectedRepo, setSelectedRepo, resetContext } = useRepository();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const repositoryService = RepositoryService.getInstance();

  useEffect(() => {
    async function fetchRepositories() {
      if (!session) return;
      try {
        setLoading(true);
        const repos = await repositoryService.fetchRepositories(session);
        setRepositories(repos);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch repositories"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchRepositories();
  }, [session]);

  const filteredRepositories = repositories.filter((repo) =>
    repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRepositorySelect = (repo: Repository) => {
    // Reset any existing state first
    resetContext();

    // Clear any existing code indexer if it's for a different provider
    const chatService = ChatService.getInstance();
    const currentIndexer = chatService.getCodeIndexer();

    if (currentIndexer && currentIndexer.getProvider() !== repo.provider) {
      chatService.clearCodeIndexer();
    }

    // Now set the selected repo
    setSelectedRepo(repo);
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <StyledTextField
          fullWidth
          size="small"
          placeholder="Search Repositories"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", py: 1 }}>
        {filteredRepositories.map((repo) => (
          <ListItemButton
            key={`${repo.provider}-${repo.id}`}
            selected={selectedRepo?.id === repo.id}
            onClick={() => handleRepositorySelect(repo)}
            sx={{
              py: 2,
              px: 2,
              borderBottom: 1,
              borderColor: "divider",
              "&.Mui-selected": {
                bgcolor: "#1c2128",
              },
              "&:hover": {
                bgcolor: "#1c2128",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                width: "100%",
                gap: 1,
              }}
            >
              {repo.provider === "github" ? (
                <GitHub sx={{ color: "text.secondary", mt: 0.5 }} />
              ) : (
                <Box sx={{ mt: 0.5 }}>
                  <Gitlab />
                </Box>
              )}
              <Box
                sx={{
                  minWidth: 0,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    width: "100%",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.primary",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {repo.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: repo.private ? "warning.dark" : "success.dark",
                      color: "text.primary",
                      fontWeight: 500,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {repo.private ? "Private" : "Public"}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                  }}
                >
                  {repo.owner?.login || repo.namespace?.name}
                </Typography>
              </Box>
            </Box>
          </ListItemButton>
        ))}
      </Box>
    </Box>
  );
}
