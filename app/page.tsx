"use client";

import GithubInterface from "@/components/github-interface";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/api/auth/signin") {
      router.push("/api/auth/signin");
    }
  }, [status, pathname, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (status === "authenticated") {
    return <GithubInterface />;
  }

  return null;
}
