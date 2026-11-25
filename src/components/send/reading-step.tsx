"use client";

import { SpinnerGap } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";
import { BottomAction } from "./sheet-shell";

/** Depois deste tempo, a tela admite a demora e oferece uma saída. */
const SLOW_AFTER_MS = 12_000;

/** Espera honesta: sem porcentagem inventada, só o que está acontecendo, como cancelar e como não esperar. */
export function ReadingStep({
  fileName,
  onCancel,
  onManual,
}: {
  fileName: string;
  onCancel: () => void;
  onManual: () => void;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <section role="status" aria-live="polite" className="rounded-card bg-card p-6 text-center">
        <SpinnerGap size={44} weight="bold" aria-hidden="true" className="mx-auto animate-spin motion-reduce:animate-none" />
        <h2 className="t-title mt-4">Lendo a nota</h2>
        <p className="t-body mt-2 text-label-2">
          {slow ? "Está demorando mais que o normal. Os leitores de IA estão ocupados." : "Pode levar alguns segundos."}
        </p>
        <p className="t-sub mt-3 truncate text-label-2">{fileName}</p>
      </section>
      <BottomAction>
        {slow && (
          <button
            type="button"
            onClick={onManual}
            className="flex h-[3.375rem] w-full items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary shadow-[var(--glow)]"
          >
            Preencher manualmente
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="flex h-[3.375rem] w-full items-center justify-center rounded-full bg-card text-[1.1875rem] font-semibold"
        >
          Cancelar
        </button>
      </BottomAction>
    </>
  );
}
