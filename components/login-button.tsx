"use client";

import { Button } from "@/components/ui/button";
import { Github, Gitlab } from "lucide-react";
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
    <div className="flex gap-4">
      <button
        onClick={() => signIn("github")}
        className="flex items-center gap-2 px-4 py-2 bg-[#24292e] hover:bg-[#1c2126] text-white rounded-lg transition-colors"
      >
        <Github className="h-5 w-5" />
        Sign in with GitHub
      </button>
      
      <button
        onClick={() => signIn("gitlab")}
        className="flex items-center gap-2 px-4 py-2 bg-[#fc6d26] hover:bg-[#e24329] text-white rounded-lg transition-colors"
      >
        <Gitlab className="h-5 w-5" />
        Sign in with GitLab
      </button>
    </div>
  );
}
