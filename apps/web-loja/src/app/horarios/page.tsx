"use client";

import { useEffect, useState } from "react";
import { DIAS_SEMANA, type AtualizarHorarioInput, type FechamentoTemporario, type HorarioFuncionamento } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { criarFechamento, excluirFechamento, getHorarios, listFechamentos, salvarHorarios } from "@/lib/api";

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function HorariosContent() {
  const { auth } = useAuth();
  const [horarios, setHorarios] = useState<AtualizarHorarioInput[] | null>(null);
  const [abertaAgora, setAbertaAgora] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [fechamentos, setFechamentos] = useState<FechamentoTemporario[]>([]);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erroFechamento, setErroFechamento] = useState<string | null>(null);

  function carregar() {
    if (!auth) return;
    getHorarios(auth.token).then((resp) => {
      setHorarios(resp.horarios);
      setAbertaAgora(resp.abertaAgora);
    });
    listFechamentos(auth.token).then(setFechamentos);
  }

  useEffect(carregar, [auth]);

  function atualizarDia(dia: number, dados: Partial<AtualizarHorarioInput>) {
    setHorarios((prev) => prev?.map((h) => (h.diaSemana === dia ? { ...h, ...dados } : h)) ?? null);
  }

  async function handleSalvarHorarios() {
    if (!auth || !horarios) return;
    setErro(null);
    setMensagem(null);
    setSalvando(true);
    try {
      await salvarHorarios(auth.token, horarios);
      setMensagem("Horários atualizados.");
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar horários");
    } finally {
      setSalvando(false);
    }
  }

  async function handleCriarFechamento(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || !inicio || !fim) return;
    setErroFechamento(null);
    try {
      await criarFechamento(auth.token, {
        inicio: new Date(inicio).toISOString(),
        fim: new Date(fim).toISOString(),
        motivo: motivo || undefined,
      });
      setInicio("");
      setFim("");
      setMotivo("");
      carregar();
    } catch (err) {
      setErroFechamento(err instanceof Error ? err.message : "Erro ao agendar fechamento");
    }
  }

  async function handleExcluirFechamento(id: number) {
    if (!auth) return;
    await excluirFechamento(auth.token, id);
    carregar();
  }

  if (!horarios) return <main className="flex-1 p-6 text-gray-500 text-sm">Carregando...</main>;

  return (
    <main className="flex-1 p-6 max-w-lg mx-auto w-full space-y-8">
      <h1 className="text-xl font-bold text-red-600 mb-2">Horários de funcionamento</h1>

      <div
        className={`border rounded-lg p-4 text-sm ${
          abertaAgora ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {abertaAgora ? "Sua loja está aberta agora." : "Sua loja está fechada agora."}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Dias e horários</h2>
        <div className="space-y-3">
          {horarios.map((h) => (
            <div key={h.diaSemana} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{DIAS_SEMANA[h.diaSemana]}</span>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={h.fechado}
                    onChange={(e) => atualizarDia(h.diaSemana, { fechado: e.target.checked })}
                    className="accent-red-600"
                  />
                  Fechado
                </label>
              </div>
              {!h.fechado && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={h.abreEm ?? ""}
                    onChange={(e) => atualizarDia(h.diaSemana, { abreEm: e.target.value || null })}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <span className="text-gray-400 text-sm">até</span>
                  <input
                    type="time"
                    value={h.fechaEm ?? ""}
                    onChange={(e) => atualizarDia(h.diaSemana, { fechaEm: e.target.value || null })}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {mensagem && <p className="text-sm text-green-700 mt-3">{mensagem}</p>}
        {erro && <p className="text-sm text-red-600 mt-3">{erro}</p>}

        <button
          onClick={handleSalvarHorarios}
          disabled={salvando}
          className="mt-4 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar horários"}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Fechamento temporário</h2>
        <p className="text-sm text-gray-500 mb-4">
          Agende um período (férias, manutenção etc.) em que a loja fica fechada pro cliente, mesmo dentro do
          horário normal.
        </p>

        <div className="space-y-2 mb-6">
          {fechamentos.map((f) => (
            <div key={f.id} className="border border-amber-100 bg-amber-50 rounded-lg p-3 flex items-start justify-between gap-3">
              <div className="text-sm text-amber-800">
                <p>
                  {formatarData(f.inicio)} até {formatarData(f.fim)}
                </p>
                {f.motivo && <p className="text-amber-700">{f.motivo}</p>}
              </div>
              <button onClick={() => handleExcluirFechamento(f.id)} className="text-red-600 text-xs hover:text-red-800 shrink-0">
                Cancelar
              </button>
            </div>
          ))}
          {fechamentos.length === 0 && <p className="text-sm text-gray-500">Nenhum fechamento agendado.</p>}
        </div>

        <form onSubmit={handleCriarFechamento} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Início</label>
              <input
                required
                type="datetime-local"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Fim</label>
              <input
                required
                type="datetime-local"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <input
            placeholder="Motivo (opcional)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
          {erroFechamento && <p className="text-sm text-red-600">{erroFechamento}</p>}
          <button type="submit" className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-700">
            + Agendar fechamento
          </button>
        </form>
      </section>
    </main>
  );
}

export default function HorariosPage() {
  return (
    <ProtectedRoute>
      <HorariosContent />
    </ProtectedRoute>
  );
}
