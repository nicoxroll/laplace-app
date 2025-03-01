"use client";

import {
  Box,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material";
import { Send, StopCircle } from "lucide-react";
import { useEffect, useRef } from "react";

interface ChatInputProps {
  input: string;
  loading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop?: () => void;
}

export function ChatInput({
  input,
  loading,
  onInputChange,
  onSubmit,
  onStop,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{
        display: "flex",
        alignItems: "center",
        p: 2,
        borderTop: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <TextField
        inputRef={inputRef}
        fullWidth
        value={input}
        onChange={onInputChange}
        placeholder={loading ? "Thinking..." : "Ask about the repository"}
        disabled={loading}
        variant="outlined"
        size="small"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            backgroundColor: "background.default",
          },
        }}
      />

      {loading && onStop && (
        <Tooltip title="Stop generating">
          <IconButton onClick={onStop} color="error" sx={{ ml: 1 }}>
            <StopCircle size={24} />
          </IconButton>
        </Tooltip>
      )}

      <IconButton
        type="submit"
        color="primary"
        disabled={!input.trim() || loading}
        sx={{ ml: 1 }}
      >
        {loading ? <CircularProgress size={24} /> : <Send />}
      </IconButton>
    </Box>
  );
}
