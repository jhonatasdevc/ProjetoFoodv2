import webpush from "web-push";
import { prisma } from "./prisma.js";

let configurado = false;

export function configurarWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:contato@eazyclub.com.br";

  if (!publicKey || !privateKey || publicKey.startsWith("troque_")) {
    console.warn("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configurados — push notification desativado.");
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configurado = true;
  console.log(`Push notification configurado (VAPID_PUBLIC_KEY termina em ...${publicKey.slice(-8)}).`);
}

interface PushPayload {
  titulo: string;
  corpo: string;
  url: string;
}

// Manda pra todas as inscrições do usuário (pode ter mais de um navegador/dispositivo).
// Nunca lança — falha de push não pode derrubar a atualização de status do pedido.
export async function enviarPushParaUsuario(idUsuario: number, payload: PushPayload) {
  if (!configurado) {
    console.warn(`enviarPushParaUsuario(${idUsuario}): ignorado, push não configurado (faltam as VAPID keys).`);
    return;
  }

  const inscricoes = await prisma.pushSubscription.findMany({ where: { idUsuario } });
  if (inscricoes.length === 0) {
    console.log(`enviarPushParaUsuario(${idUsuario}): usuário não tem nenhuma inscrição salva.`);
    return;
  }

  await Promise.all(
    inscricoes.map(async (inscricao) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.chaveP256dh, auth: inscricao.chaveAuth },
          },
          JSON.stringify({ title: payload.titulo, body: payload.corpo, url: payload.url }),
        );
        console.log(`Push enviado com sucesso pra inscrição ${inscricao.id} (usuário ${idUsuario}).`);
      } catch (err) {
        // 404/410 = inscrição expirada ou revogada pelo navegador — limpa do banco.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          console.warn(`Inscrição ${inscricao.id} expirada (status ${status}) — removendo do banco.`);
          await prisma.pushSubscription.delete({ where: { id: inscricao.id } }).catch(() => {});
        } else {
          console.error(`Erro ao enviar push pra inscrição ${inscricao.id}:`, err);
        }
      }
    }),
  );
}
