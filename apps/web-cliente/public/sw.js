// Pedidos cujo chat está aberto e visível em alguma aba agora — evita notificar
// o cliente sobre uma mensagem que ele já está vendo na tela.
const chatsAbertos = new Set();

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object" || !data.idPedido) return;
  if (data.type === "chat-aberto") chatsAbertos.add(data.idPedido);
  else if (data.type === "chat-fechado") chatsAbertos.delete(data.idPedido);
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  if (payload.idPedido && chatsAbertos.has(payload.idPedido)) return;
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/window.svg",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.endsWith(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
