"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Usuario, VerificarOtpInput, VerificarOtpResponse } from "@delivery/shared";
import { verificarOtp } from "./api";

const STORAGE_KEY = "delivery.web-cliente.auth";

interface AuthState {
  token: string;
  usuario: Usuario;
}

interface AuthContextValue {
  auth: AuthState | null;
  carregando: boolean;
  verificarCodigo: (input: VerificarOtpInput) => Promise<VerificarOtpResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setAuth(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setCarregando(false);
  }, []);

  async function verificarCodigo(input: VerificarOtpInput) {
    const resposta = await verificarOtp(input);
    if (!resposta.precisaCadastro) {
      const novoAuth = { token: resposta.token, usuario: resposta.usuario };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novoAuth));
      setAuth(novoAuth);
    }
    return resposta;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }

  return (
    <AuthContext.Provider value={{ auth, carregando, verificarCodigo, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
