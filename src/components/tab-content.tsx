"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

/**
 * Envolve o conteúdo das abas e, a cada troca de aba, faz a tela nova entrar num fundido curto (`.tab-enter`), em
 * vez do corte seco. Não remonta nada: o Next guarda a aba anterior com o estado, e isso continua valendo.
 * Com "reduzir movimento" ligado, o CSS não anima.
 */
export function TabContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Antes da pintura, para a tela nova não aparecer inteira por um quadro e só depois sumir e voltar.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.classList.remove("tab-enter");
    void el.offsetWidth; // reinicia a animação mesmo em trocas seguidas
    el.classList.add("tab-enter");
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
