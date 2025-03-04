"use client";

import { Box, Paper, Typography } from "@mui/material";
import { LucideIcon } from "lucide-react";
import React from "react";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode; // Nueva prop para acciones
}

export function SectionCard({
  icon: Icon,
  title,
  children,
  className,
  action,
}: SectionCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
      }}
      className={className}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Icon className="h-5 w-5 mr-2" />
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
        </Box>
        {action && <Box sx={{ ml: 2 }}>{action}</Box>}
      </Box>
      {children}
    </Paper>
  );
}
