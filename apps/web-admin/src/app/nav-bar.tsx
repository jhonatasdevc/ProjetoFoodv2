"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function NavBar() {
  const { auth, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!auth || pathname === "/login") return null;

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="border-b border-red-100 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-red-600">Painel admin</span>
        <nav className="flex gap-4 text-sm">
          <Link
            href="/restaurantes"
            className={pathname.startsWith("/restaurantes") ? "text-green-700 font-medium" : "text-gray-600"}
          >
            Restaurantes
          </Link>
          <Link href="/grupos" className={pathname === "/grupos" ? "text-green-700 font-medium" : "text-gray-600"}>
            Grupos
          </Link>
          <Link href="/cupons" className={pathname === "/cupons" ? "text-green-700 font-medium" : "text-gray-600"}>
            Cupons
          </Link>
        </nav>
      </div>
      <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">
        Sair
      </button>
    </header>
  );
}
