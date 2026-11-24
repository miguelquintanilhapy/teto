"use client";

import { useState } from "react";
import { quarterlyRevenue, type Cents } from "@/core";
import { formatCompact, formatReais, monthInitial, monthName } from "@/lib/format";

type Mode = "mes" | "tri";

interface Bar {
  key: string;
  label: string;
  fullLabel: string;
  cents: Cents;
  current: boolean;
}

/**
 * Receita por mês (ou por trimestre), com as barras saindo do zero.
 * O mês atual fica em destaque; os demais, em cinza. Poucos elementos: o dado é o protagonista.
 */
export function MonthlyChart({
  year,
  months,
  firstMonth,
  currentMonth,
}: {
  year: number;
  /** Receita confirmada de cada mês (índice 0 = janeiro). */
  months: Cents[];
  /** Primeiro mês com atividade (mês de abertura, no ano de abertura). */
  firstMonth: number;
  /** Mês de hoje (índice 0 = janeiro). */
  currentMonth: number;
}) {
  const [mode, setMode] = useState<Mode>("mes");
  const total = months.reduce((s, v) => s + v, 0);

  const bars: Bar[] =
    mode === "mes"
      ? months.slice(firstMonth, currentMonth + 1).map((cents, i) => {
          const m = firstMonth + i;
          return { key: `m${m}`, label: monthInitial(m), fullLabel: monthName(m), cents, current: m === currentMonth };
        })
      : quarterlyRevenue(months).flatMap((cents, q): Bar[] => {
          const started = q * 3 + 2 >= firstMonth && q * 3 <= currentMonth;
          if (!started) return [];
          return [
            {
              key: `q${q}`,
              label: `T${q + 1}`,
              fullLabel: `${q + 1}º trimestre`,
              cents,
              current: Math.floor(currentMonth / 3) === q,
            },
          ];
        });

  const max = Math.max(1, ...bars.map((b) => b.cents));
  const summary = bars.map((b) => `${b.fullLabel}: ${formatReais(b.cents)}`).join("; ");

  return (
    <section aria-labelledby="chart-title" className="rounded-card bg-card px-5 pt-[1.125rem] pb-4">
      <div className="flex items-center justify-between">
        <h2 id="chart-title" className="text-xl font-bold tracking-tight">
          {mode === "mes" ? "Por mês" : "Por trimestre"}
        </h2>
        <div className="flex rounded-2xl bg-track p-[3px] text-[0.8125rem] font-semibold" role="group" aria-label="Agrupar por">
          {(["mes", "tri"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`pressable min-h-9 rounded-[0.8125rem] px-3.5 py-1.5 ${mode === m ? "bg-raised text-label shadow-sm" : "text-label-2"}`}
            >
              {m === "mes" ? "Mês" : "Trimestre"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1.5 mb-3.5 text-[0.9375rem] text-label-2">
        <span className="sensitive">{formatReais(total)}</span> em {year}
      </p>

      <div role="img" aria-label={`Receita confirmada. ${summary}`} className="flex h-[9.375rem] items-end gap-2">
        {bars.map((b, i) => (
          <div
            key={b.key}
            className={`flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 text-xs font-semibold ${
              b.current ? "text-label" : "text-label-2"
            }`}
          >
            {b.current && b.cents > 0 && <span className="sensitive text-[0.6875rem] font-bold whitespace-nowrap">{formatCompact(b.cents)}</span>}
            <div
              className="bar-grow w-full rounded-t-[0.4375rem] rounded-b-[0.1875rem] bg-label"
              style={{ height: `${Math.max(3, (b.cents / max) * 100)}%`, opacity: b.current ? 1 : 0.45, ['--i' as string]: i }}
            />
            <span aria-hidden="true">{b.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
