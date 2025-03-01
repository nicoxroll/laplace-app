"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Typography,
  alpha,
} from "@mui/material";
import { keyframes } from "@mui/system";
import { Cat, Github, Gitlab } from "lucide-react";
import { signIn } from "next-auth/react";

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

export default function SignIn() {
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
              onClick={() => signIn("github", { callbackUrl: "/" })}
              variant="contained"
              size="large"
              startIcon={<Github />}
              fullWidth
              sx={{
                bgcolor: "#238636",
                color: "white",
                py: 1.5,
                "&:hover": {
                  bgcolor: "#2ea043",
                },
                "& .MuiButton-startIcon": {
                  mr: 1.5,
                },
              }}
            >
              Sign in with GitHub
            </Button>

            <Button
              onClick={() => signIn("gitlab", { callbackUrl: "/" })}
              variant="contained"
              size="large"
              startIcon={<Gitlab />}
              fullWidth
              sx={{
                bgcolor: "#fc6d26",
                color: "white",
                py: 1.5,
                "&:hover": {
                  bgcolor: "#e24329",
                },
                "& .MuiButton-startIcon": {
                  mr: 1.5,
                },
              }}
            >
              Sign in with GitLab
            </Button>
          </Box>

          <Divider
            sx={{
              my: 3,
              borderColor: alpha("#30363d", 0.5),
            }}
          />

          <Typography
            variant="body2"
            align="center"
            sx={{
              color: "text.secondary",
              px: 2,
            }}
          >
            Choose your preferred Git provider to continue
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
