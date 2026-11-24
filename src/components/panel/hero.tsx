import { CheckCircle, Warning } from "@phosphor-icons/react/dist/ssr";
import type { Dashboard } from "@/core";
import { bandView, type Tone } from "@/lib/copy";
import { centsPart, formatPercent, formatReais, wholeReais } from "@/lib/format";
import { Room, RoofKey } from "@/components/room";

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-ok-text",
  warn: "text-warn-text",
  danger: "text-danger-text",
};

const TONE_TINT: Record<Tone, string> = {
  ok: "color-mix(in srgb, var(--ok) 20%, transparent)",
  warn: "color-mix(in srgb, var(--warn) 22%, transparent)",
  danger: "color-mix(in srgb, var(--danger) 22%, transparent)",
};

/** O número do ano e a sala do limite. A cor do estado tinge o cartão inteiro. */
export function Hero({ dashboard }: { dashboard: Dashboard }) {
  const { year, accumulatedCents, limitCents, toleranceLimitCents, usedRatio, headroomCents, band } = dashboard;
  const { label, tone } = bandView(band);
  const StatusIcon = tone === "ok" ? CheckCircle : Warning;

  return (
    <section
      aria-labelledby="hero-title"
      className="flex gap-3.5 rounded-card p-5 pr-[1.125rem]"
      style={{ background: `linear-gradient(155deg, ${TONE_TINT[tone]} 0%, transparent 64%), var(--card)` }}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h2 id="hero-title" className="text-base font-medium text-label-2">
            Faturamento de {year}
          </h2>
          <p className="t-display sensitive mt-0.5 mb-2.5">
            R$&nbsp;{wholeReais(accumulatedCents)}
            <span className="sr-only">{centsPart(accumulatedCents)}</span>
          </p>
          <p className={`flex items-center gap-2 text-[1.0625rem] font-bold ${TONE_TEXT[tone]}`}>
            <StatusIcon size={20} weight="fill" aria-hidden="true" />
            {label}
          </p>
          <p className="mt-1 text-base leading-snug text-label-2">
            {formatPercent(usedRatio)} do limite.{" "}
            <span className="sensitive">
              {headroomCents > 0 ? `Ainda cabem ${formatReais(headroomCents)}.` : "O limite do ano já foi atingido."}
            </span>
          </p>
        </div>
        <dl className="t-caption mt-3.5 flex flex-col gap-1.5 text-label-2">
          <div className="flex items-center gap-2">
            <RoofKey />
            <dt>Limite</dt>
            <dd className="font-semibold text-label">{formatReais(limitCents)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <RoofKey dotted />
            <dt>+20%</dt>
            <dd className="font-semibold text-label">{formatReais(toleranceLimitCents)}</dd>
          </div>
        </dl>
      </div>
      <Room
        ratio={usedRatio}
        tone={tone}
        label={`Você usou ${formatPercent(usedRatio)} do limite de ${formatReais(limitCents)}`}
      />
    </section>
  );
}
