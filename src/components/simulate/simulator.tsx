"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Target, Warning, WarningOctagon } from "@phosphor-icons/react/dist/ssr";
import { BarKey, LimitBar, TONE_FILL } from "@/components/limit-bar";
import { rulesFor } from "@/core";
import { CurrencyField } from "@/components/send/currency-field";
import { formatPercent, formatReais } from "@/lib/format";
import { simulationView, type SimulateContext } from "@/lib/simulate";

const TONE_TEXT = { ok: "text-ok-text", warn: "text-warn-text", alert: "text-alert-text", danger: "text-danger-text" } as const;

/** Valor atrasado: o leitor de tela anuncia o resultado quando a digitação para, e não a cada número. */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * "E se eu aceitar uma venda de R$ X?" Responde na hora, enquanto o valor é digitado.
 *
 * Hierarquia de leitura, de cima para baixo: o estado (selo pequeno), a RESPOSTA em número grande (quanto ainda
 * cabe, ou quanto passa do limite), uma frase só com a consequência e, por último, a barra. Antes o cartão tinha um
 * selo, um título que repetia o selo e um parágrafo com dois valores: não se sabia para onde olhar.
 */
export function Simulator({ ctx }: { ctx: SimulateContext }) {
  const [cents, setCents] = useState(0);
  const view = useMemo(() => simulationView(ctx, cents), [ctx, cents]);
  const headroom = Math.max(0, ctx.limitCents - ctx.accumulatedCents);
  const settled = useDebounced(cents, 700);
  const spoken = useMemo(() => (settled > 0 ? simulationView(ctx, settled) : null), [ctx, settled]);

  const presets = [500_00, 1_000_00, 5_000_00];
  const cfg = rulesFor(ctx.year);
  const scaleMax = 1 + cfg.toleranceRate;
  const toleranceCents = Math.round(ctx.limitCents * scaleMax);
  // "Acima do limite · 105%" e não "Acima do limite · 105% do limite".
  const pct = formatPercent(view.ratio);
  const pctText = view.band.label.toLowerCase().includes("limite") ? pct : `${pct} do limite`;
  const StateIcon = view.band.tone === "ok" ? CheckCircle : view.band.tone === "danger" ? WarningOctagon : Warning;
  const simulating = cents > 0;

  return (
    <>
      {/* No computador (lg), a tela vira duas colunas: campo e atalhos à esquerda, resultado à direita. */}
      <div className="divide-y divide-sep rounded-card bg-card lg:col-start-1 lg:row-start-2">
        <CurrencyField label="Valor da venda" cents={cents} onChange={setCents} />
        {headroom > 0 && (
          // Preenche com o que ainda cabe no limite: uma ação diferente dos atalhos de valor, junto do campo.
          <button
            type="button"
            onClick={() => setCents(headroom)}
            className="pressable hoverable flex min-h-12 w-full items-center gap-2 rounded-b-card px-5 text-left text-[0.9375rem] font-semibold text-action"
          >
            <Target size={17} weight="bold" aria-hidden="true" />
            Usar o que ainda cabe: <span className="sensitive">{formatReais(headroom)}</span>
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 lg:col-start-1 lg:row-start-3">
        {presets.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setCents(value)}
            className="pressable hoverable min-h-11 rounded-full bg-card px-2 py-2 text-[0.9375rem] font-semibold"
          >
            {formatReais(value)}
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {spoken ? `${spoken.band.label}. ${spoken.answer.label} ${formatReais(spoken.answer.cents)}. ${spoken.note}` : ""}
      </p>

      <section aria-label={simulating ? "Resultado da simulação" : "Situação de hoje"} className="mt-5 rounded-card bg-card p-5 lg:col-start-2 lg:row-span-3 lg:row-start-2 lg:mt-0">
        <p className={`flex items-center gap-1.5 text-[0.9375rem] font-bold ${TONE_TEXT[view.band.tone]}`}>
          <StateIcon size={17} weight="fill" aria-hidden="true" />
          {simulating ? view.band.label : `Hoje · ${view.band.label}`} · <span className="sensitive">{pctText}</span>
        </p>

        <p className="t-sub mt-3 text-label-2">{view.answer.label}</p>
        <p className="t-display sensitive mt-0.5 text-[clamp(2rem,10vw,2.625rem)]">{formatReais(view.answer.cents)}</p>
        <p className="t-body mt-1.5 text-label-2">{view.note}</p>

        <div className="mt-5">
          <LimitBar
            ratio={view.ratio}
            addedRatio={view.addedRatio}
            tone={view.band.tone}
            label={simulating ? `Com esta venda você usaria ${formatPercent(view.ratio)} do limite` : `Hoje você usou ${formatPercent(view.ratio)} do limite`}
            scaleMax={scaleMax}
          />
          <div className="t-caption mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-label-2">
            <BarKey className={TONE_FILL[view.band.tone]}>Já faturado</BarKey>
            {simulating && <BarKey className="bg-label">Esta venda</BarKey>}
            <BarKey mark>Limite {formatReais(ctx.limitCents)}</BarKey>
          </div>
          <p className="t-caption mt-1 text-label-2">A faixa clara vai até {formatReais(toleranceCents)}: os 20% de tolerância.</p>
        </div>

        {view.costLine && <p className="t-sub sensitive mt-4 rounded-2xl bg-tile p-3.5 text-label-2">{view.costLine}</p>}
      </section>

      <p className="t-caption mt-4 px-2 text-label-2 lg:col-start-1 lg:row-start-4 lg:px-0">Só uma simulação: nada é lançado. A conta usa a receita bruta (o que entra), não o lucro.</p>
    </>
  );
}
