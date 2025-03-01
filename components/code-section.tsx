"use client";

import { SectionCard } from "@/components/ui/section-card";
import type { Repository } from "@/types/repository";
import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Code } from "lucide-react";
import { CodeViewer } from "./code-viewer";

interface CodeSectionProps {
  repository: Repository;
}

export function CodeSection({ repository }: CodeSectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (!repository) {
    return (
      <SectionCard icon={Code} title="Code">
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1">
            Please select a repository to view code.
          </Typography>
        </Box>
      </SectionCard>
    );
  }

  return (
    <SectionCard icon={Code} title={`Code - ${repository.full_name}`}>
      <Box
        sx={{
          height: isMobile ? "calc(100vh - 8rem)" : "calc(100vh - 12rem)",
          overflow: "auto",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <CodeViewer />
      </Box>
    </SectionCard>
  );
}
