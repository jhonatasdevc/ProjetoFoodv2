"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const { auth, logout } = useAuth();
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  function handleLogout() {
    logout();
    setAberto(false);
    router.push("/");
  }

  return (
    <>
      <header className="border-b border-red-100 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-red-600">
          Para pedir é Eazy.
        </Link>
        <button onClick={() => setAberto(true)} aria-label="Abrir menu" className="text-2xl leading-none text-gray-700">
          ☰
        </button>
      </header>

      {aberto && (
        <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setAberto(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-white p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setAberto(false)} className="text-gray-400 hover:text-gray-600 text-xl">
              ×
            </button>

            {auth ? (
              <>
                <p className="font-semibold text-gray-900">
                  {auth.usuario.nome} {auth.usuario.sobrenome}
                </p>
                <Link href="/perfil" onClick={() => setAberto(false)} className="block text-gray-700 hover:text-red-600">
                  Meu perfil e endereços
                </Link>
                <button onClick={handleLogout} className="block text-red-600 hover:text-red-800">
                  Sair
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setAberto(false)}
                className="block bg-red-600 text-white text-center font-medium py-2 rounded hover:bg-red-700"
              >
                Entrar / Cadastrar
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
