"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { auth, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    router.replace(auth ? "/restaurantes" : "/login");
  }, [auth, carregando, router]);

  return null;
}
