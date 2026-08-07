import { inscreverPush } from "./api";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// A applicationServerKey do PushManager espera Uint8Array, não a string base64url da chave VAPID.
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Padded = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function suportaPush() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function statusPermissaoPush(): Promise<NotificationPermission | "indisponivel"> {
  if (!suportaPush()) return "indisponivel";
  return Notification.permission;
}

export async function ativarNotificacoes(token: string): Promise<void> {
  if (!suportaPush()) throw new Error("Notificações não são suportadas nesse navegador");
  if (!VAPID_PUBLIC_KEY) throw new Error("Notificações não configuradas no servidor");

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") throw new Error("Permissão de notificação negada");

  const registro = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Inscrição de push inválida");
  }

  await inscreverPush(token, {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
}
