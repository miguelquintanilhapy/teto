"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react/dist/ssr";
import { applyPrivacy, parsePrivacy, PRIVACY_KEY } from "@/lib/prefs";
import { usePref, writePref } from "./use-pref";

/** Liga e desliga "Ocultar valores": borra os valores em dinheiro, para abrir o app em público. */
export function PrivacyToggle({ variant = "button" }: { variant?: "button" | "row" }) {
  const hidden = parsePrivacy(usePref(PRIVACY_KEY));

  function toggle() {
    const next = !hidden;
    applyPrivacy(document.documentElement, next);
    writePref(PRIVACY_KEY, next ? "on" : null);
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={hidden}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left"
      >
        <span>
          <span className="t-row block">Ocultar valores</span>
          <span className="t-sub block text-label-2">Borra os valores em dinheiro nas telas</span>
        </span>
        <span aria-hidden="true" className={`relative h-7 w-[3.9375rem] shrink-0 rounded-full ${hidden ? "bg-ok" : "bg-track"}`}>
          <span className={`absolute top-0.5 h-6 w-9 rounded-full bg-white shadow transition-[left] ${hidden ? "left-[1.4375rem]" : "left-0.5"}`} />
        </span>
      </button>
    );
  }

  const Icon = hidden ? EyeSlash : Eye;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
      className="glass grid size-11 shrink-0 place-items-center rounded-full text-label"
    >
      <Icon size={20} weight="bold" aria-hidden="true" />
    </button>
  );
}
