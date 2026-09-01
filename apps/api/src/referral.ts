import crypto from "node:crypto";

const SECRET = process.env.JWT_SECRET ?? "troque_esse_segredo_em_producao";
// IV fixo — não protege segredo nenhum (é só o id numérico do usuário), o objetivo é só
// não expor um id sequencial óbvio no link público; precisa ser determinístico (mesmo
// usuário sempre gera o mesmo código) pra o link compartilhado continuar funcionando.
const IV = Buffer.alloc(16, 0);

function chave(): Buffer {
  return crypto.createHash("sha256").update(SECRET).digest();
}

// Código de indicação: uma versão ofuscada do id do usuário, usada no link público
// (/loja/{arroba}?ref={codigo}) em vez do id numérico cru.
export function codificarIdUsuario(id: number): string {
  const cipher = crypto.createCipheriv("aes-256-ctr", chave(), IV);
  return Buffer.concat([cipher.update(String(id)), cipher.final()]).toString("base64url");
}

export function decodificarIdUsuario(codigo: string): number | null {
  try {
    const decipher = crypto.createDecipheriv("aes-256-ctr", chave(), IV);
    const texto = Buffer.concat([decipher.update(Buffer.from(codigo, "base64url")), decipher.final()]).toString(
      "utf8",
    );
    const id = Number(texto);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
