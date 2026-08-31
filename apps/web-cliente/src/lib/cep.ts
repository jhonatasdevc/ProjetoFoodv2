export interface EnderecoPorCep {
  rua: string;
  cidade: string;
  estado: string;
}

// ViaCEP é público, sem autenticação — busca só dispara quando o CEP já tem 8 dígitos.
export async function buscarCep(cep: string): Promise<EnderecoPorCep | null> {
  const cepLimpo = cep.replace(/\D/g, "");
  if (cepLimpo.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
  if (!res.ok) throw new Error("Erro ao buscar CEP");

  const data = await res.json();
  if (data.erro) return null;

  return { rua: data.logradouro ?? "", cidade: data.localidade ?? "", estado: data.uf ?? "" };
}

export function formatarCep(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}
