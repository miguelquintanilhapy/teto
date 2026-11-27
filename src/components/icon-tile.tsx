import type { Tone } from "@/lib/copy";

/**
 * O quadradinho do ícone de um cartão, como no Ajustes do iPhone: a cor ajuda a achar o cartão de relance.
 * - "action" (azul): o cartão é uma ação.
 * - "tax" (azul-petróleo): cor de categoria do DAS, só para o quadradinho, nunca em texto ou número.
 * - Tons de estado (ok, warn, alert, danger): só quando o cartão mostra um estado de verdade, e sempre com texto.
 * - "neutral": o cinza de antes.
 */
export type TileTone = "neutral" | "action" | "tax" | Tone;

const BASE: Record<Exclude<TileTone, "neutral">, string> = {
  action: "var(--primary)",
  tax: "var(--tax)",
  ok: "var(--ok)",
  warn: "var(--warn)",
  alert: "var(--alert)",
  danger: "var(--danger)",
};

const ICON: Record<TileTone, string> = {
  neutral: "text-label",
  action: "text-action",
  tax: "text-tax",
  ok: "text-ok-text",
  warn: "text-warn-text",
  alert: "text-alert-text",
  danger: "text-danger-text",
};

export function IconTile({ tone = "neutral", children }: { tone?: TileTone; children: React.ReactNode }) {
  return (
    <span
      className={`grid size-[1.875rem] shrink-0 place-items-center rounded-lg ${tone === "neutral" ? "bg-tile" : ""} ${ICON[tone]}`}
      style={tone === "neutral" ? undefined : { background: `color-mix(in srgb, ${BASE[tone]} var(--tile-tint), transparent)` }}
    >
      {children}
    </span>
  );
}
