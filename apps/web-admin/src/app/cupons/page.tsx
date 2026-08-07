"use client";

import { useEffect, useState } from "react";
import type { Cupom, PercentualCupom } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { criarCupom, editarCupom, listCuponsAdmin } from "@/lib/api";

const PERCENTUAIS: PercentualCupom[] = [5, 10, 15, 20];

function CuponsContent() {
  const { auth } = useAuth();
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [codigo, setCodigo] = useState("");
  const [valorDesconto, setValorDesconto] = useState<PercentualCupom>(10);
  const [validoAte, setValidoAte] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    if (!auth) return;
    listCuponsAdmin(auth.token).then(setCupons);
  }

  useEffect(carregar, [auth]);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setErro(null);
    try {
      await criarCupom(auth.token, {
        codigo,
        valorDesconto,
        validoAte: validoAte ? new Date(validoAte).toISOString() : undefined,
      });
      setCodigo("");
      setValidoAte("");
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar cupom");
    }
  }

  async function handleToggleAtivo(cupom: Cupom) {
    if (!auth) return;
    await editarCupom(auth.token, cupom.id, { ativo: !cupom.ativo });
    carregar();
  }

  return (
    <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-xl font-bold text-red-600 mb-6">Cupons de desconto</h1>

      <form onSubmit={handleCriar} className="space-y-3 mb-8 border border-red-100 rounded-lg p-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Código</label>
          <input
            required
            minLength={3}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ex: PROMO10"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Desconto</label>
          <div className="flex gap-2">
            {PERCENTUAIS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setValorDesconto(p)}
                className={`px-4 py-2 rounded border text-sm font-medium ${
                  valorDesconto === p ? "bg-red-600 text-white border-red-600" : "border-gray-300 text-gray-700"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Válido até (opcional)</label>
          <input
            type="date"
            value={validoAte}
            onChange={(e) => setValidoAte(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button type="submit" className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-700">
          + Criar cupom
        </button>
      </form>

      <div className="space-y-2">
        {cupons.map((cupom) => (
          <div key={cupom.id} className="flex items-center justify-between border border-red-100 rounded-lg p-4">
            <div>
              <p className="font-semibold text-gray-900">{cupom.codigo}</p>
              <p className="text-sm text-gray-500">
                {cupom.valorDesconto}% off{cupom.validoAte ? ` · válido até ${new Date(cupom.validoAte).toLocaleDateString("pt-BR")}` : ""}
              </p>
            </div>
            <button onClick={() => handleToggleAtivo(cupom)} className={`text-sm ${cupom.ativo ? "text-green-700" : "text-gray-400"}`}>
              {cupom.ativo ? "Ativo" : "Inativo"}
            </button>
          </div>
        ))}
        {cupons.length === 0 && <p className="text-gray-500 text-sm">Nenhum cupom cadastrado.</p>}
      </div>
    </main>
  );
}

export default function CuponsPage() {
  return (
    <ProtectedRoute>
      <CuponsContent />
    </ProtectedRoute>
  );
}
