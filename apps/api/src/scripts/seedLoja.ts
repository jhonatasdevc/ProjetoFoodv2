// Utilitário pra gerar/atualizar a senha de uma loja de teste.
// Uso: npm run seed:loja --workspace=apps/api -- email@loja.com senha123
import "../env.js";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";

const [email, senha] = process.argv.slice(2);

if (!email || !senha) {
  console.error("Uso: tsx src/scripts/seedLoja.ts <email> <senha>");
  process.exit(1);
}

const senhaHash = await bcrypt.hash(senha, 10);
const loja = await prisma.loja.update({ where: { email }, data: { senhaHash } });
console.log(`Senha atualizada para a loja "${loja.nome}" (${loja.email})`);
await prisma.$disconnect();
