"use client";

import { signIn } from "next-auth/react";
import { Bot, Github, Share2 } from "lucide-react";
import Image from "next/image";

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-[#161b22] p-8 rounded-lg border border-[#30363d] shadow-xl">
          <div className="flex items-center justify-center mb-8">
            <Bot className="h-10 w-10 text-blue-400 mr-3" />
            <h1 className="text-2xl font-bold text-gray-200">Laplace</h1>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => signIn("github", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 bg-[#238636] text-white px-4 py-3 rounded-lg hover:bg-[#2ea043] transition-colors"
            >
              <Github className="h-5 w-5" />
              Sign in with GitHub
            </button>

            <button
              onClick={() => signIn("gitlab", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 bg-[#fc6d26] text-white px-4 py-3 rounded-lg hover:bg-[#e24329] transition-colors"
            >
              <Share2 className="h-5 w-5" />
              Sign in with GitLab
            </button>
          </div>

          <p className="mt-6 text-sm text-gray-400 text-center">
            Choose your preferred Git provider to continue
          </p>
        </div>
      </div>
    </div>
  );
}