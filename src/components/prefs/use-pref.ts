"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // armazenamento bloqueado (janela privada, por exemplo): segue sem preferência
  }
}

/** Lê uma preferência do aparelho e atualiza a tela quando ela muda. */
export function usePref(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento: a escolha vale só até recarregar */
  }
  listeners.forEach((l) => l());
}
