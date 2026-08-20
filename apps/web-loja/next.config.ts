import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@delivery/shared"],
  // Sem isso, o servidor de dev do Next bloqueia requisições (incluindo o
  // WebSocket do HMR) vindas de fora de localhost — página fica em branco
  // quando servida atrás do Traefik num domínio público.
  allowedDevOrigins: ["loja.eazyclub.com.br"],
};

export default nextConfig;
