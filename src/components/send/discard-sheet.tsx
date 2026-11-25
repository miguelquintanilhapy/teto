"use client";

import { useEffect, useRef } from "react";

/**
 * Confirmação antes de perder o que foi lido ou digitado, no padrão de "action sheet" do iOS:
 * a ação destrutiva é nomeada pelo que faz, e a saída segura vem focada. Escape também mantém a edição.
 */
export function DiscardSheet({ onKeep, onDiscard }: { onKeep: () => void; onDiscard: () => void }) {
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onKeep();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKeep]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45" onClick={onKeep}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-title"
        aria-describedby="discard-text"
        onClick={(e) => e.stopPropagation()}
        className="page-enter w-full max-w-[430px] rounded-t-[2rem] bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <h2 id="discard-title" className="t-title">
          Descartar este lançamento?
        </h2>
        <p id="discard-text" className="t-body mt-2 text-label-2">
          Os dados ainda não foram confirmados e serão perdidos.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="pressable flex h-[3.375rem] w-full items-center justify-center rounded-full bg-danger text-[1.1875rem] font-bold text-white"
          >
            Descartar
          </button>
          <button
            ref={keepRef}
            type="button"
            onClick={onKeep}
            className="pressable flex h-[3.375rem] w-full items-center justify-center rounded-full bg-track text-[1.1875rem] font-semibold"
          >
            Continuar editando
          </button>
        </div>
      </div>
    </div>
  );
}
