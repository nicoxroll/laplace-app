"use client";

import { SectionCard } from "@/components/ui/section-card";
import { Repository } from "@/types/repository";
import { Box, Grid, Paper, Typography } from "@mui/material";
import {
  AlertCircle,
  GitBranch,
  GitCommit,
  LineChart,
  Star,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface InsightData {
  stars: number;
  forks: number;
  branches: number;
  commits: number;
  contributors: number;
}

interface InsightsSectionProps {
  repository: Repository;
}

export function InsightsSection({ repository }: InsightsSectionProps) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightData | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      if (status === "loading") return;

      if (!session?.user?.accessToken) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (repository.provider === "gitlab") {
          // GitLab API calls
          const headers = {
            Authorization: `Bearer ${session.user.accessToken}`,
          };

          const [projectResponse, branchesResponse, commitsResponse] =
            await Promise.all([
              fetch(`https://gitlab.com/api/v4/projects/${repository.id}`, {
                headers,
              }),
              fetch(
                `https://gitlab.com/api/v4/projects/${repository.id}/repository/branches`,
                { headers }
              ),
              fetch(
                `https://gitlab.com/api/v4/projects/${repository.id}/repository/commits`,
                { headers }
              ),
            ]);

          if (!projectResponse.ok) {
            throw new Error(
              `Failed to fetch GitLab project data: ${projectResponse.statusText}`
            );
          }

          const [projectData, branchesData, commitsData] = await Promise.all([
            projectResponse.json(),
            branchesResponse.json(),
            commitsResponse.json(),
          ]);

          setInsights({
            stars: projectData.star_count || 0,
            forks: projectData.forks_count || 0,
            branches: Array.isArray(branchesData) ? branchesData.length : 0,
            commits: Array.isArray(commitsData) ? commitsData.length : 0,
            contributors: projectData.contributors_count || 0,
          });
        } else {
          // Existing GitHub code
          const [owner, repo] = repository.full_name.split("/");
          const headers = {
            Authorization: `Bearer ${session.user.accessToken}`,
            Accept: "application/vnd.github.v3+json",
          };

          const [repoResponse, branchesResponse, contributorsResponse] =
            await Promise.all([
              fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                headers,
              }),
              fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
                headers,
              }),
              fetch(
                `https://api.github.com/repos/${owner}/${repo}/contributors`,
                { headers }
              ),
            ]);

          if (!repoResponse.ok) {
            throw new Error(
              `Failed to fetch GitHub repository data: ${repoResponse.statusText}`
            );
          }

          const [repoData, branchesData, contributorsData] = await Promise.all([
            repoResponse.json(),
            branchesResponse.json(),
            contributorsResponse.json(),
          ]);

          setInsights({
            stars: repoData.stargazers_count || 0,
            forks: repoData.forks_count || 0,
            branches: Array.isArray(branchesData) ? branchesData.length : 0,
            commits: repoData.size || 0,
            contributors: Array.isArray(contributorsData)
              ? contributorsData.length
              : 0,
          });
        }
      } catch (err) {
        console.error("Error fetching insights:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch insights"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [repository, session, status]);

  if (loading) {
    return (
      <Box
        sx={{
          maxWidth: "4xl",
          p: 6,
          bgcolor: "background.paper",
          borderRadius: 1,
          boxShadow: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            mb: 6,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: "primary.main",
          }}
        >
          <LineChart />
          Loading Insights...
        </Typography>
        <Grid container spacing={2}>
          {[...Array(5)].map((_, i) => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "background.default",
                  borderRadius: 1,
                  border: 1,
                  borderColor: "divider",
                  animation: "pulse 1.5s infinite ease-in-out",
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <Box
                    sx={{
                      height: 20,
                      width: 20,
                      borderRadius: "50%",
                      bgcolor: "grey.700",
                    }}
                  />
                  <Box
                    sx={{
                      height: 16,
                      bgcolor: "grey.700",
                      borderRadius: 0.5,
                      width: 80,
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    height: 32,
                    bgcolor: "grey.700",
                    borderRadius: 0.5,
                    width: 64,
                    mt: 1,
                  }}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          maxWidth: "4xl",
          p: 6,
          bgcolor: "background.paper",
          borderRadius: 1,
          boxShadow: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            mb: 6,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: "error.main",
          }}
        >
          <AlertCircle />
          Error loading Insights
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "error.light",
            fontFamily: "monospace",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <SectionCard
      icon={LineChart}
      title={`Repository Insights - ${repository.full_name}`}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={6} lg={4}>
          <Paper
            sx={{
              p: 2,
              bgcolor: "background.default",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Star sx={{ color: "warning.main" }} />
              <Typography variant="body2" color="text.secondary">
                Stars
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: "bold" }}>
              {insights?.stars.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <Paper
            sx={{
              p: 2,
              bgcolor: "background.default",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <GitBranch sx={{ color: "secondary.main" }} />
              <Typography variant="body2" color="text.secondary">
                Branches
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: "bold" }}>
              {insights?.branches.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <Paper
            sx={{
              p: 2,
              bgcolor: "background.default",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <GitCommit sx={{ color: "success.main" }} />
              <Typography variant="body2" color="text.secondary">
                Commits
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: "bold" }}>
              {insights?.commits.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <Paper
            sx={{
              p: 2,
              bgcolor: "background.default",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Users sx={{ color: "info.main" }} />
              <Typography variant="body2" color="text.secondary">
                Contributors
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: "bold" }}>
              {insights?.contributors.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <Paper
            sx={{
              p: 2,
              bgcolor: "background.default",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Star sx={{ color: "warning.main" }} />
              <Typography variant="body2" color="text.secondary">
                Forks
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: "bold" }}>
              {insights?.forks.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </SectionCard>
  );
}
