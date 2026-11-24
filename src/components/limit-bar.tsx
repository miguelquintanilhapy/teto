import type { Tone } from "@/lib/copy";

const FILL: Record<Tone, string> = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger" };

/**
 * Medidor linear do limite: o que já foi usado, mais (em destaque) o que esta nota acrescenta.
 * As duas pontas são legendadas por quem usa o componente.
 */
export function LimitBar({ ratio, addedRatio = 0, tone, label }: { ratio: number; addedRatio?: number; tone: Tone; label: string }) {
  const total = Math.min(1, Math.max(0, ratio));
  const added = Math.min(total, Math.max(0, addedRatio));
  const base = total - added;
  return (
    <div role="img" aria-label={label} className="flex h-3.5 overflow-hidden rounded-full bg-track">
      <div className={`h-full ${FILL[tone]}`} style={{ width: `${base * 100}%` }} />
      {added > 0 && <div className="h-full bg-label" style={{ width: `${added * 100}%` }} />}
    </div>
  );
}
