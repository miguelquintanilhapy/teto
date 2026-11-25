import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { PREFS_SCRIPT } from "@/lib/prefs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Teto: controle do limite do MEI",
  description: "Acompanhe seu faturamento, antecipe o estouro do limite do MEI e saiba quanto isso custa.",
  appleWebApp: { capable: true, title: "Teto", statusBarStyle: "black-translucent" },
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
        {/* Película do tamanho da barra de status (zero fora do celular): o conteúdo que rola por baixo some em vez de colidir com a hora e a bateria. */}
        <div
          aria-hidden="true"
          className="no-print pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top,0px)] bg-gradient-to-b from-bg from-75% to-transparent"
        />
        {children}
      </body>
    </html>
  );
}
