"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react/dist/ssr";
import { SettingsTile } from "@/components/settings";
import { applyPrivacy, parsePrivacy, PRIVACY_KEY } from "@/lib/prefs";
import { usePref, writePref } from "./use-pref";

/** Liga e desliga "Ocultar valores": troca os valores em dinheiro por uma barra, para abrir o app em público. */
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
        className="pressable hoverable flex w-full items-center gap-3.5 px-5 py-3.5 text-left"
      >
        <SettingsTile icon={Eye} />
        <span className="min-w-0 flex-1">
          <span className="t-row block">Ocultar valores</span>
          <span className="t-sub block text-label-2">Troca os valores por uma barra, para abrir o app em público</span>
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
      aria-label="Ocultar valores"
      className="glass pressable grid size-11 shrink-0 place-items-center rounded-full text-label"
    >
      <Icon size={20} weight="bold" aria-hidden="true" />
    </button>
  );
}
