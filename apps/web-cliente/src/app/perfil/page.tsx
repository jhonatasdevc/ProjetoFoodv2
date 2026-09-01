"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CarteiraResponse, Endereco } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { criarEndereco, editarEndereco, excluirEndereco, getCarteira, listEnderecos, patchUsuarioMe } from "@/lib/api";
import { buscarCep, formatarCep } from "@/lib/cep";

const ENDERECO_VAZIO = { cep: "", cidade: "", estado: "", rua: "", numero: "", complemento: "", referencia: "" };

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CarteiraTab() {
  const { auth } = useAuth();
  const [carteira, setCarteira] = useState<CarteiraResponse | null>(null);

  useEffect(() => {
    if (!auth) return;
    getCarteira(auth.token).then(setCarteira);
  }, [auth]);

  if (!carteira) return <p className="text-sm text-gray-500">Carregando...</p>;

  return (
    <section>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-green-800">Total em cashback</p>
        <p className="text-2xl font-bold text-green-700">{formatBRL(carteira.totalCashback)}</p>
      </div>

      {carteira.porLoja.length === 0 ? (
        <p className="text-sm text-gray-500">
          Você ainda não tem cashback. Compartilhe o link de uma loja (botão ↗ Compartilhar na página dela) — quando
          alguém pedir pela primeira vez por lá, você ganha cashback quando o pedido for entregue.
        </p>
      ) : (
        <div className="space-y-2">
          {carteira.porLoja.map((s) => (
            <Link
              key={s.idLoja}
              href={`/loja/${s.lojaArroba}`}
              className="flex items-center justify-between border border-red-100 rounded-lg p-4 hover:bg-red-50"
            >
              <span className="font-medium text-gray-900">{s.lojaNome}</span>
              <span className="text-green-700 font-semibold">{formatBRL(s.saldo)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function PerfilContent() {
  const { auth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [aba, setAba] = useState<"dados" | "carteira">("dados");
  const [nome, setNome] = useState(auth?.usuario.nome ?? "");
  const [sobrenome, setSobrenome] = useState(auth?.usuario.sobrenome ?? "");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [novoEndereco, setNovoEndereco] = useState(ENDERECO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);

  async function handleCepChange(valor: string) {
    const formatado = formatarCep(valor);
    setNovoEndereco((prev) => ({ ...prev, cep: formatado }));
    setErroCep(null);

    if (formatado.replace(/\D/g, "").length !== 8) return;
    setBuscandoCep(true);
    try {
      const resultado = await buscarCep(formatado);
      if (!resultado) {
        setErroCep("CEP não encontrado");
        return;
      }
      setNovoEndereco((prev) => ({ ...prev, rua: resultado.rua, cidade: resultado.cidade, estado: resultado.estado }));
    } catch {
      setErroCep("Erro ao buscar CEP — preencha o endereço manualmente");
    } finally {
      setBuscandoCep(false);
    }
  }

  function carregarEnderecos() {
    if (!auth) return;
    listEnderecos(auth.token).then(setEnderecos);
  }

  useEffect(carregarEnderecos, [auth]);

  async function handleSalvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setSalvandoPerfil(true);
    setMensagem(null);
    try {
      await patchUsuarioMe(auth.token, { nome, sobrenome });
      setMensagem("Perfil atualizado.");
    } catch (err) {
      setMensagem(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function handleAdicionarEndereco(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setErro(null);
    try {
      await criarEndereco(auth.token, {
        ...novoEndereco,
        complemento: novoEndereco.complemento || undefined,
        referencia: novoEndereco.referencia || undefined,
      });
      setNovoEndereco(ENDERECO_VAZIO);
      carregarEnderecos();
      // Veio do checkout (sem endereço ainda) — volta pra loja com o carrinho reaberto
      // em vez de deixar o usuário perdido na tela de perfil.
      const redirect = searchParams.get("redirect");
      if (redirect) {
        router.push(`${redirect}?abrirCarrinho=1`);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao adicionar endereço");
    }
  }

  async function handleDefinirPadrao(id: number) {
    if (!auth) return;
    await editarEndereco(auth.token, id, { padrao: true });
    carregarEnderecos();
  }

  async function handleExcluir(id: number) {
    if (!auth) return;
    await excluirEndereco(auth.token, id);
    carregarEnderecos();
  }

  return (
    <main className="flex-1 p-6 max-w-lg mx-auto w-full space-y-8">
      <h1 className="text-xl font-bold text-red-600 mb-2">Meu perfil</h1>

      <div className="flex gap-2 border-b border-gray-100">
        <button
          onClick={() => setAba("dados")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            aba === "dados" ? "border-red-600 text-red-600" : "border-transparent text-gray-500"
          }`}
        >
          Meus dados
        </button>
        <button
          onClick={() => setAba("carteira")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            aba === "carteira" ? "border-red-600 text-red-600" : "border-transparent text-gray-500"
          }`}
        >
          Carteira
        </button>
      </div>

      {aba === "carteira" && <CarteiraTab />}

      {aba === "dados" && (
        <>
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Meus endereços</h2>
        <div className="space-y-2 mb-6">
          {enderecos.map((e) => (
            <div key={e.id} className="border border-red-100 rounded-lg p-4 flex items-start justify-between gap-3">
              <div className="text-sm text-gray-700">
                <p>
                  {e.rua}, {e.numero}
                  {e.complemento ? ` - ${e.complemento}` : ""}
                </p>
                <p>
                  {e.cidade}/{e.estado} - CEP {e.cep}
                </p>
                {e.referencia && <p className="text-gray-500">{e.referencia}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 text-xs shrink-0">
                {e.padrao ? (
                  <span className="text-green-700">Padrão</span>
                ) : (
                  <button onClick={() => handleDefinirPadrao(e.id)} className="text-gray-500 hover:text-red-600">
                    Tornar padrão
                  </button>
                )}
                <button onClick={() => handleExcluir(e.id)} className="text-red-600 hover:text-red-800">
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {enderecos.length === 0 && <p className="text-sm text-gray-500">Nenhum endereço cadastrado.</p>}
        </div>

        <form onSubmit={handleAdicionarEndereco} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Novo endereço</h3>

          <div>
            <div className="relative">
              <input
                required
                placeholder="CEP"
                inputMode="numeric"
                value={novoEndereco.cep}
                onChange={(e) => handleCepChange(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              {buscandoCep && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Buscando...</span>
              )}
            </div>
            {erroCep && <p className="text-xs text-red-600 mt-1">{erroCep}</p>}
            {!erroCep && (
              <p className="text-xs text-gray-400 mt-1">Digite o CEP pra preencher rua, cidade e estado automaticamente.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <input
              required
              placeholder="Rua"
              value={novoEndereco.rua}
              onChange={(e) => setNovoEndereco({ ...novoEndereco, rua: e.target.value })}
              className="col-span-2 border border-gray-300 rounded px-3 py-2"
            />
            <input
              required
              placeholder="Número"
              value={novoEndereco.numero}
              onChange={(e) => setNovoEndereco({ ...novoEndereco, numero: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Cidade"
              value={novoEndereco.cidade}
              onChange={(e) => setNovoEndereco({ ...novoEndereco, cidade: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2"
            />
            <input
              required
              placeholder="Estado (UF)"
              maxLength={2}
              value={novoEndereco.estado}
              onChange={(e) => setNovoEndereco({ ...novoEndereco, estado: e.target.value.toUpperCase() })}
              className="border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <input
            placeholder="Complemento (opcional)"
            value={novoEndereco.complemento}
            onChange={(e) => setNovoEndereco({ ...novoEndereco, complemento: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <input
            placeholder="Observação / referência (opcional) — ex: portão azul, perto do mercado"
            value={novoEndereco.referencia}
            onChange={(e) => setNovoEndereco({ ...novoEndereco, referencia: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button type="submit" className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-700">
            + Adicionar endereço
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Meus dados</h2>
        <form onSubmit={handleSalvarPerfil} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Nome</label>
            <input required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
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
          <p className="text-sm text-gray-500">Celular: {auth?.usuario.telefone}</p>
          {mensagem && <p className="text-sm text-green-700">{mensagem}</p>}
          <button
            type="submit"
            disabled={salvandoPerfil}
            className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {salvandoPerfil ? "Salvando..." : "Salvar perfil"}
          </button>
        </form>
      </section>
        </>
      )}
    </main>
  );
}

export default function PerfilPage() {
  return (
    <ProtectedRoute>
      <PerfilContent />
    </ProtectedRoute>
  );
}
