"use client";

import { X } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { PREV_PATH_KEY } from "./nav-memory";

/**
 * O X das folhas. Se o usuário veio de outra tela do app, volta para ela (como o "voltar" do sistema);
 * se abriu a folha direto (link, recarregou a página), vai para o destino padrão.
 */
export function CloseButton({ fallback, className }: { fallback: string; className: string }) {
  const router = useRouter();
  function close() {
    let prev: string | null = null;
    try {
      prev = sessionStorage.getItem(PREV_PATH_KEY);
    } catch {
      prev = null;
    }
    if (prev && prev !== window.location.pathname && window.history.length > 1) router.back();
    else router.push(fallback);
  }
  return (
    <button type="button" onClick={close} aria-label="Fechar" className={className}>
      <X size={20} weight="bold" aria-hidden="true" />
    </button>
  );
}
