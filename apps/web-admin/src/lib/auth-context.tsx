"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Admin, LoginAdminInput } from "@delivery/shared";
import { loginAdmin } from "./api";

const STORAGE_KEY = "delivery.web-admin.auth";

interface AuthState {
  token: string;
  admin: Admin;
}

interface AuthContextValue {
  auth: AuthState | null;
  carregando: boolean;
  login: (input: LoginAdminInput) => Promise<void>;
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

  async function login(input: LoginAdminInput) {
    const resposta = await loginAdmin(input);
    const novoAuth = { token: resposta.token, admin: resposta.admin };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novoAuth));
    setAuth(novoAuth);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }

  return <AuthContext.Provider value={{ auth, carregando, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
