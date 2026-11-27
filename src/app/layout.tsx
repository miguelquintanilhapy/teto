import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { NavMemory } from "@/components/nav/nav-memory";
import { PREFS_SCRIPT } from "@/lib/prefs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Tela de abertura do app instalado no iPhone (o iOS mostra enquanto a página carrega): fundo preto e a logo
 * branca, uma imagem por tamanho de tela. Sem ela, o iOS mostra uma tela lisa e o app "pisca" ao abrir.
 */
const STARTUP_IMAGES = [
  { url: "/brand/splash/teto-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/brand/splash/teto-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/brand/splash/teto-1206x2622.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/brand/splash/teto-1320x2868.png", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/brand/splash/teto-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/brand/splash/teto-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/brand/splash/teto-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/brand/splash/teto-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/brand/splash/teto-828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
  { url: "/brand/splash/teto-1242x2208.png", media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/brand/splash/teto-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
];

export const metadata: Metadata = {
  title: "Teto: controle do limite do MEI",
  description: "Acompanhe seu faturamento, antecipe o estouro do limite do MEI e saiba quanto isso custa.",
  appleWebApp: { capable: true, title: "Teto", statusBarStyle: "black-translucent", startupImage: STARTUP_IMAGES },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Aplica o tema e a privacidade guardados antes da primeira pintura, para a tela não piscar. */}
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {/*
          Abertura: primeiro só o ícone (o T com o telhado), depois o "eto" se revela ao lado, e tudo some num fundido
          (2,3 s, só com CSS, sem esperar nada: o app carrega por baixo). Só na primeira visita da sessão (o
          PREFS_SCRIPT marca data-seen), e nunca com "reduzir movimento". O preto emenda com a tela nativa.
        */}
        <div aria-hidden="true" className="splash no-print">
          <span className="splash-mark" />
        </div>
        {/* Película do tamanho da barra de status (zero fora do celular): o conteúdo que rola por baixo some em vez de colidir com a hora e a bateria. */}
        <div
          aria-hidden="true"
          className="no-print pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top,0px)] bg-gradient-to-b from-bg from-75% to-transparent"
        />
        {/* Lê o caminho da página: com o cache de componentes, isso precisa de um Suspense próprio. */}
        <Suspense fallback={null}>
          <NavMemory />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
