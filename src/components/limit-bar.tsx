import type { Tone } from "@/lib/copy";
import { barGeometry } from "@/lib/limit-geometry";

export const TONE_FILL: Record<Tone, string> = { ok: "bg-ok", warn: "bg-warn", alert: "bg-alert", danger: "bg-danger" };

/**
 * Medidor linear do limite: o que já foi usado e, em destaque, o que esta venda ou nota acrescenta.
 *
 * Com `scaleMax` acima de 1 (ex.: 1,2), a barra vai até o limite com tolerância: um traço marca o limite e o trecho
 * depois dele fica levemente tingido. A legenda é de quem usa o componente. Com "Ocultar valores" ligado, o
 * preenchimento some (a altura revelaria o valor escondido).
 */
export function LimitBar({
  ratio,
  addedRatio = 0,
  tone,
  label,
  scaleMax = 1,
  fill,
}: {
  ratio: number;
  addedRatio?: number;
  tone: Tone;
  label: string;
  scaleMax?: number;
  /** Classe de cor que substitui a do estado (ex.: uma barra que não é de risco). */
  fill?: string;
}) {
  const g = barGeometry(ratio, addedRatio, scaleMax);
  const showLimit = g.limitAt < 1;
  return (
    <div role="img" aria-label={label} className="relative">
      <div className="relative flex h-3.5 overflow-hidden rounded-full bg-track">
        {showLimit && (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0"
            style={{ left: `${g.limitAt * 100}%`, background: "color-mix(in srgb, var(--warn) 16%, transparent)" }}
          />
        )}
        <div className={`privacy-hide relative h-full ${fill ?? TONE_FILL[tone]}`} style={{ width: `${g.base * 100}%` }} />
        {g.added > 0 && <div className="privacy-hide relative h-full bg-label" style={{ width: `${g.added * 100}%` }} />}
      </div>
      {showLimit && (
        <div aria-hidden="true" className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-label" style={{ left: `calc(${g.limitAt * 100}% - 1px)` }} />
      )}
    </div>
  );
}

/** Legenda curta da barra: bolinha com a cor e o texto. */
export function BarKey({ className, children, mark = false }: { className?: string; children: React.ReactNode; mark?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      {mark ? (
        <i aria-hidden="true" className="h-3 w-0.5 rounded-full bg-label" />
      ) : (
        <i aria-hidden="true" className={`size-2.5 rounded-full ${className ?? ""}`} />
      )}
      {children}
    </span>
  );
}
