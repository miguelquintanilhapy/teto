"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Chave em que fica a tela anterior desta aba do navegador (só o caminho, nada pessoal). */
export const PREV_PATH_KEY = "teto:prev-path";

/**
 * Lembra a tela de onde o usuário veio. Serve ao X das folhas: com uma origem conhecida, ele volta para ela
 * (o filtro e a rolagem continuam lá), em vez de sempre ir para uma tela fixa e empilhar histórico.
 */
export function NavMemory() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current && last.current !== pathname) {
      try {
        sessionStorage.setItem(PREV_PATH_KEY, last.current);
      } catch {
        /* armazenamento bloqueado: o X usa o destino fixo */
      }
    }
    last.current = pathname;
  }, [pathname]);
  return null;
}
