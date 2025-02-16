"use client";

import { useSession } from "next-auth/react";
import Component from "./code-view";

export default function GithubInterface() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1117] text-gray-300">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-300">
      <Component />
    </div>
  );
}
