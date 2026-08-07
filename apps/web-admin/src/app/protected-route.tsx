"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { auth, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !auth) router.replace("/login");
  }, [carregando, auth, router]);

  if (carregando || !auth) return null;

  return <>{children}</>;
}
