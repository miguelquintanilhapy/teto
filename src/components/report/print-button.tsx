"use client";

import { Printer } from "@phosphor-icons/react/dist/ssr";

/** Abre a impressão do navegador, de onde dá para salvar em PDF. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="pressable flex h-[3.375rem] w-full items-center justify-center gap-2 rounded-full bg-card text-[1.1875rem] font-semibold text-action"
    >
      <Printer size={22} weight="bold" aria-hidden="true" />
      Imprimir ou salvar em PDF
    </button>
  );
}
