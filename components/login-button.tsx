"use client";

import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

export function LoginButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <Button
        onClick={() => signOut()}
        variant="ghost"
        className="text-gray-300 hover:bg-[#30363d]"
      >
        Sign out
      </Button>
    );
  }

  return (
    <Button
      onClick={() => signIn("github")}
      variant="ghost"
      className="text-gray-300 hover:bg-[#30363d] gap-2"
    >
      <Github className="h-4 w-4" />
      Sign in with GitHub
    </Button>
  );
}
