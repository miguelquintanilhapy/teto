"use client";

import { useEffect, useMemo, useState } from "react";
import { Target } from "@phosphor-icons/react/dist/ssr";
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

/** "E se eu aceitar uma venda de R$ X?" Responde na hora, enquanto o valor é digitado. */
export function Simulator({ ctx }: { ctx: SimulateContext }) {
  const [cents, setCents] = useState(0);
  const view = useMemo(() => simulationView(ctx, cents), [ctx, cents]);
  const headroom = Math.max(0, ctx.limitCents - ctx.accumulatedCents);
  const settled = useDebounced(cents, 700);
  const spoken = useMemo(() => (settled > 0 ? simulationView(ctx, settled) : null), [ctx, settled]);

  const presets = [500_00, 1_000_00, 5_000_00];
  const scaleMax = 1 + rulesFor(ctx.year).toleranceRate;
  const currentRatio = ctx.limitCents > 0 ? ctx.accumulatedCents / ctx.limitCents : 0;
  // "Acima do limite · 105%" e não "Acima do limite · 105% do limite".
  const pct = formatPercent(view.ratio);
  const pctText = view.band.label.toLowerCase().includes("limite") ? pct : `${pct} do limite`;

  return (
    <>
      <div className="rounded-card bg-card">
        <CurrencyField label="Valor da venda" cents={cents} onChange={setCents} />
      </div>

      {/* Os atalhos quebram de linha: rolando de lado, o último ("O que cabe") ficava cortado na borda. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setCents(value)}
            className="pressable hoverable min-h-11 shrink-0 rounded-full bg-card px-4 py-2 text-[0.9375rem] font-semibold"
          >
            {formatReais(value)}
          </button>
        ))}
        {headroom > 0 && (
          // Ação diferente dos atalhos de valor: preenche com o que ainda cabe no limite.
          <button
            type="button"
            onClick={() => setCents(headroom)}
            className="pressable hoverable flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-sep px-4 py-2 text-[0.9375rem] font-semibold text-action"
          >
            <Target size={17} weight="bold" aria-hidden="true" />
            O que cabe
          </button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {spoken ? `${spoken.band.label}. ${spoken.headline} ${spoken.detail}` : ""}
      </p>
      {cents === 0 ? (
        // Sem valor, não há venda para simular: mostra onde você está hoje.
        <section aria-label="Situação de hoje" className="mt-5 rounded-card bg-card p-5">
          <h2 className="t-title">Quanto é a venda?</h2>
          <p className="t-body mt-2 text-label-2">
            Digite um valor ou toque num atalho. Hoje você está em <span className="sensitive">{formatPercent(currentRatio)}</span> do limite.
          </p>
          <div className="mt-4">
            <LimitBar ratio={currentRatio} tone={view.band.tone} label={`Hoje você usou ${formatPercent(currentRatio)} do limite`} scaleMax={scaleMax} />
            <div className="t-caption mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-label-2">
              <BarKey className={TONE_FILL[view.band.tone]}>Já faturado</BarKey>
              <BarKey mark>Limite</BarKey>
            </div>
            <p className="t-caption mt-1 text-label-2">{view.references}</p>
          </div>
        </section>
      ) : (
        <section aria-label="Resultado da simulação" className="mt-5 rounded-card bg-card p-5">
          <p className={`mb-1 text-[1.0625rem] font-bold ${TONE_TEXT[view.band.tone]}`}>
            {view.band.label} · {pctText}
          </p>
          <h2 className="t-title sensitive">{view.headline}</h2>
          <p className="t-body sensitive mt-2 text-label-2">{view.detail}</p>

          <div className="mt-4">
            <LimitBar
              ratio={view.ratio}
              addedRatio={view.addedRatio}
              tone={view.band.tone}
              label={`Com esta venda você usaria ${formatPercent(view.ratio)} do limite`}
              scaleMax={scaleMax}
            />
            <div className="t-caption mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-label-2">
              <BarKey className={TONE_FILL[view.band.tone]}>Já faturado</BarKey>
              <BarKey className="bg-label">Esta venda</BarKey>
              <BarKey mark>Limite</BarKey>
            </div>
            <p className="t-caption mt-1 text-label-2">{view.references}</p>
          </div>

          {view.costLine && <p className="t-body sensitive mt-4 rounded-2xl bg-tile p-3.5 text-label-2">{view.costLine}</p>}
        </section>
      )}

      <p className="t-sub mt-4 px-2 text-label-2">
        É só uma simulação: nada é lançado. A conta usa a receita bruta (o que entra), não o lucro. Os custos são estimativas e não substituem o cálculo oficial.
      </p>
    </>
  );
}
