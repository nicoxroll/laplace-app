"use client";

import { Button } from "@mui/material";
import { Cat } from "lucide-react";
import { signIn } from "next-auth/react";

interface LoginButtonProps {
  provider: string;
  label: string;
}

export function LoginButton({ provider, label }: LoginButtonProps) {
  const handleLogin = () => {
    signIn(provider, { callbackUrl: "/" });
  };

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleLogin}
      startIcon={<Cat size={20} />}
      sx={{
        py: 1.5,
        px: 3,
        borderRadius: 2,
        textTransform: "none",
        fontWeight: 500,
        backgroundColor: "#0d1117",
        "&:hover": {
          backgroundColor: "#161b22",
        },
      }}
    >
      {label}
    </Button>
  );
}
