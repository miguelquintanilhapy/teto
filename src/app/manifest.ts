import type { MetadataRoute } from "next";

/** Permite instalar o Teto na tela inicial do celular, com a logo e sem a barra do navegador. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // O Android mostra o "name" na tela de abertura: o nome longo saía cortado.
    name: "Teto",
    short_name: "Teto",
    description: "Acompanhe seu faturamento e antecipe o estouro do limite do MEI.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "pt-BR",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
