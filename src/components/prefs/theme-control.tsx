"use client";

import { Moon, Sun, SunHorizon } from "@phosphor-icons/react/dist/ssr";
import { applyTheme, parseTheme, themeColorFor, THEME_KEY, type Theme } from "@/lib/prefs";
import { withThemeTransition } from "@/lib/theme-transition";
import { usePref, writePref } from "./use-pref";

const OPTIONS: Array<{ id: Theme; label: string; Icon: typeof Sun }> = [
  { id: "system", label: "Sistema", Icon: SunHorizon },
  { id: "light", label: "Claro", Icon: Sun },
  { id: "dark", label: "Escuro", Icon: Moon },
];

function setThemeColor(color: string | null) {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    if (color) {
      m.dataset.original ??= m.content;
      m.content = color;
    } else if (m.dataset.original) {
      m.content = m.dataset.original;
    }
  });
}

/** Escolha do tema: Sistema, Claro ou Escuro. Fica guardada neste aparelho. */
export function ThemeControl() {
  const theme = parseTheme(usePref(THEME_KEY));
  const index = Math.max(0, OPTIONS.findIndex((o) => o.id === theme));

  function choose(next: Theme) {
    if (next === theme) return;
    withThemeTransition(() => {
      applyTheme(document.documentElement, next);
      setThemeColor(themeColorFor(next));
    });
    writePref(THEME_KEY, next === "system" ? null : next);
  }

  return (
    <div role="radiogroup" aria-label="Tema" className="relative grid grid-cols-3 rounded-2xl bg-track p-[3px] text-[0.9375rem] font-semibold">
      {/* O marcador desliza de uma opção à outra, como no controle segmentado do iOS. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-[0.8125rem] bg-raised shadow-sm motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.3,0.9,0.3,1)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={theme === id}
          onClick={() => choose(id)}
          className={`pressable relative flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-[0.8125rem] px-1 py-2.5 ${
            theme === id ? "text-label" : "text-label-2"
          }`}
        >
          <Icon size={18} weight={theme === id ? "fill" : "regular"} aria-hidden="true" className="shrink-0 max-[360px]:hidden" />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </div>
  );
}
