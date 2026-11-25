import { execSync } from "node:child_process";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Política de conteúdo: o app só carrega código, estilo, fonte e imagem da própria origem, e só fala
 * com a própria origem (as APIs ficam no mesmo domínio). `unsafe-inline` em script é necessário porque o
 * Next injeta o script de hidratação sem nonce; o resto fica fechado. Em desenvolvimento, o React precisa
 * de `unsafe-eval` e do websocket do recarregamento.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Ninguém pode embutir o Teto numa moldura (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O envio de nota usa o seletor do sistema; o app nunca pede câmera, microfone nem localização.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** Versão que aparece no Perfil: o commit publicado (Vercel) ou o commit local. Não é segredo: o repositório é público. */
function buildId(): string {
  const v = process.env.VERCEL_GIT_COMMIT_SHA;
  if (v) return v.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || "dev";
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId() },
  cacheComponents: true,
  partialPrefetching: true,
  // Sem o cabeçalho "X-Powered-By: Next.js": não entrega a tecnologia de graça.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
