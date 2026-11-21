"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { readSession } from "@/lib/session-client";

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

/** Login page body: skips the form when a valid session already exists in this browser. */
export function LoginScreen() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  useEffect(() => {
    if (readSession()) router.replace(next);
  }, [next, router]);

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <AmbientBackground />
      <LoginForm next={next} />
    </main>
  );
}
