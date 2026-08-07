"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { solicitarOtp } from "@/lib/api";

function LoginForm() {
  const { verificarCodigo } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [etapa, setEtapa] = useState<"telefone" | "codigo">("telefone");
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoDev, setCodigoDev] = useState<string | null>(null);
  const [precisaCadastro, setPrecisaCadastro] = useState(false);
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleEnviarTelefone(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resp = await solicitarOtp({ telefone });
      setCodigoDev(resp.codigoDev);
      setEtapa("codigo");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar código");
    } finally {
      setEnviando(false);
    }
  }

  async function handleConfirmarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resp = await verificarCodigo({
        telefone,
        codigo,
        nome: precisaCadastro ? nome : undefined,
        sobrenome: precisaCadastro ? sobrenome : undefined,
      });
      if (resp.precisaCadastro) {
        setPrecisaCadastro(true);
        return;
      }
      router.push(redirect);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao confirmar código");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-red-600 text-center">Entrar</h1>

        {etapa === "telefone" && (
          <form onSubmit={handleEnviarTelefone} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Celular</label>
              <input
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-red-600 text-white font-semibold py-3 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {enviando ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        )}

        {etapa === "codigo" && (
          <form onSubmit={handleConfirmarCodigo} className="space-y-4">
            {codigoDev && (
              <p className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded px-3 py-2">
                Modo dev: o código enviado é <strong>{codigoDev}</strong> (sem SMS real nesta versão).
              </p>
            )}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Código recebido</label>
              <input
                required
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            {precisaCadastro && (
              <>
                <p className="text-sm text-gray-600">Primeiro acesso — complete seu cadastro:</p>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Nome</label>
                  <input
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Sobrenome</label>
                  <input
                    required
                    value={sobrenome}
                    onChange={(e) => setSobrenome(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </>
            )}

            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-red-600 text-white font-semibold py-3 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {enviando ? "Confirmando..." : "Confirmar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
