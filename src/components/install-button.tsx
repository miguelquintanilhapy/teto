"use client";

import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * No Android (Chrome e afins), o navegador oferece a instalação por um evento: com ele, um botão "Instalar"
 * de verdade. No iPhone o evento não existe e o botão simplesmente não aparece (lá, o passo a passo resolve).
 */
export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setDone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (done) return <p className="t-body mt-3 rounded-card bg-card p-4 text-ok-text">Instalado. Procure o ícone do Teto na tela inicial.</p>;
  if (!prompt) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") setDone(true);
        setPrompt(null);
      }}
      className="pressable mt-4 flex h-[3.375rem] w-full items-center justify-center gap-2 rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary shadow-[var(--glow)]"
    >
      <DownloadSimple size={22} weight="bold" aria-hidden="true" />
      Instalar o Teto
    </button>
  );
}
