"use client";

import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import { Cat } from "lucide-react";
import { signOut } from "next-auth/react";

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

export default function SignOut() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: "100%",
          bgcolor: "#161b22",
          border: "1px solid",
          borderColor: "#30363d",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.36)",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 4,
              "&:hover": {
                "& .bot-icon": {
                  animation: `${pulse} 1s ease-in-out`,
                },
              },
            }}
          >
            <Cat className="bot-icon h-12 w-12 text-blue-400 mr-3" />
            <Typography
              variant="h4"
              component="h1"
              sx={{
                color: "text.primary",
                fontWeight: 700,
                letterSpacing: "-0.5px",
              }}
            >
              Laplace
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              variant="contained"
              size="large"
              fullWidth
              sx={{
                bgcolor: "#24292e",
                color: "white",
                py: 1.5,
                "&:hover": {
                  bgcolor: "#1c2126",
                },
              }}
            >
              Sign out
            </Button>
          </Box>

          <Typography
            variant="body2"
            align="center"
            sx={{
              color: "text.secondary",
              px: 2,
              mt: 3,
            }}
          >
            Are you sure you want to sign out?
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
