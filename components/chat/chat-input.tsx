import { ChatInputProps } from "@/types/chat";
import { Send, StopCircle } from "lucide-react";
import { Box } from "@mui/material";

export function ChatInput({
  input,
  loading,
  onInputChange,
  onSubmit,
  onStop,
}: ChatInputProps) {
  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{
        p: 2,
        borderTop: 1,
        borderColor: "#30363d",
        bgcolor: "#161b22",
      }}
    >
      <Box sx={{ position: "relative" }}>
        <Box
          component="input"
          type="text"
          value={input}
          onChange={onInputChange}
          placeholder="Ask about the repository..."
          disabled={loading}
          sx={{
            width: "100%",
            p: 2,
            pr: 8,
            bgcolor: "#0d1117",
            color: "text.primary",
            border: 1,
            borderColor: "#30363d",
            borderRadius: 1,
            "&:focus": {
              outline: "none",
              borderColor: "#1f6feb",
            },
            "&::placeholder": {
              color: "text.secondary",
            },
          }}
        />
        <Box
          sx={{
            position: "absolute",
            right: 2,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            gap: 1,
          }}
        >
          {loading && (
            <Box
              component="button"
              type="button"
              onClick={onStop}
              sx={{
                p: 1,
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
                cursor: "pointer",
                bgcolor: "transparent",
                border: "none",
              }}
            >
              <StopCircle className="h-4 w-4" />
            </Box>
          )}
          <Box
            component="button"
            type="submit"
            disabled={loading || !input.trim()}
            sx={{
              p: 1,
              color: "text.secondary",
              "&:hover": { color: "text.primary" },
              cursor: "pointer",
              bgcolor: "transparent",
              border: "none",
              "&:disabled": {
                opacity: 0.5,
                cursor: "not-allowed",
              },
            }}
          >
            <Send className="h-4 w-4" />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
