"use client";

import { Box, Typography } from "@mui/material";
import { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
}

export function SectionCard({
  icon: Icon,
  title,
  children,
  className = "",
  fullHeight = false,
}: SectionCardProps) {
  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: "background.paper",
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        marginTop: 2,
        height: fullHeight ? "calc(100vh - 8rem)" : "auto",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        sx={{
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Typography
          variant="h6"
          color="textPrimary"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          {Icon && <Icon size={20} />}
          {title}
        </Typography>
      </Box>

      <Box>{children}</Box>
    </Box>
  );
}
