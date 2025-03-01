"use client";

import { Box, Fab, Tooltip } from "@mui/material";
import { Cat } from "lucide-react";

interface ChatToggleButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function ChatToggleButton({ onClick, isOpen }: ChatToggleButtonProps) {
  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1000,
      }}
    >
      <Tooltip title={isOpen ? "Close AI Chat" : "Open AI Chat"}>
        <Fab
          color="primary"
          onClick={onClick}
          sx={{
            backgroundColor: "#0d1117",
            "&:hover": {
              backgroundColor: "#161b22",
            },
          }}
        >
          <Cat size={24} />
        </Fab>
      </Tooltip>
    </Box>
  );
}
