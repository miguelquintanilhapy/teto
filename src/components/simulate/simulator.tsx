"use client";

import { useEffect, useMemo, useState } from "react";
import { LimitBar } from "@/components/limit-bar";
import { CurrencyField } from "@/components/send/currency-field";
import { formatPercent, formatReais } from "@/lib/format";
import { simulationView, type SimulateContext } from "@/lib/simulate";

const TONE_TEXT = { ok: "text-ok-text", warn: "text-warn-text", danger: "text-danger-text" } as const;

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

  const presets: Array<{ label: string; value: number }> = [
    { label: formatReais(500_00), value: 500_00 },
    { label: formatReais(1_000_00), value: 1_000_00 },
    { label: formatReais(5_000_00), value: 5_000_00 },
    ...(headroom > 0 ? [{ label: "O que cabe", value: headroom }] : []),
  ];

  return (
    <>
      <div className="rounded-card bg-card">
        <CurrencyField label="Valor da venda" cents={cents} onChange={setCents} />
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setCents(p.value)}
            className="pressable hoverable min-h-11 shrink-0 rounded-full bg-card px-4 py-2 text-[0.9375rem] font-semibold"
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {spoken ? `${spoken.band.label}. ${spoken.headline} ${spoken.detail}` : ""}
      </p>
      <section aria-label="Resultado da simulação" className="mt-5 rounded-card bg-card p-5">
        <p className={`mb-1 text-[1.0625rem] font-bold ${TONE_TEXT[view.band.tone]}`}>
          {view.band.label} · {formatPercent(view.ratio)} do limite
        </p>
        <h2 className="t-title sensitive">{view.headline}</h2>
        <p className="t-body sensitive mt-2 text-label-2">{view.detail}</p>

        <div className="mt-4">
          <LimitBar
            ratio={view.ratio}
            addedRatio={view.addedRatio}
            tone={view.band.tone}
            label={`Com esta venda você usaria ${formatPercent(view.ratio)} do limite`}
          />
          <div className="t-caption mt-2 flex justify-between text-label-2">
            <span className="sensitive">{formatReais(view.result.after.accumulatedCents)}</span>
            <span>Limite de {formatReais(ctx.limitCents)}</span>
          </div>
          <p className="t-caption sensitive mt-1 text-label-2">{view.references}</p>
        </div>

        {view.costLine && <p className="t-body sensitive mt-4 rounded-2xl bg-tile p-3.5 text-label-2">{view.costLine}</p>}
      </section>

      <p className="t-sub mt-4 px-2 text-label-2">
        É só uma simulação: nada é lançado. A conta usa a receita bruta (o que entra), não o lucro. Os custos são estimativas e não substituem o cálculo oficial.
      </p>
    </>
  );
}
