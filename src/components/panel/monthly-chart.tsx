"use client";

import { useState } from "react";
import { quarterlyRevenue, type Cents } from "@/core";
import { formatCompact, formatReais, monthName, monthShort } from "@/lib/format";

type Mode = "mes" | "tri";

interface Bar {
  key: string;
  label: string;
  fullLabel: string;
  cents: Cents;
  current: boolean;
}

/**
 * Receita por mês (ou por trimestre), com as barras saindo do zero. Tocar numa barra mostra o valor e o nome do
 * mês; o mês atual vem selecionado. Poucos elementos: o dado é o protagonista.
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
  const [picked, setPicked] = useState<string | null>(null);
  const total = months.reduce((s, v) => s + v, 0);

  const bars: Bar[] =
    mode === "mes"
      ? months.slice(firstMonth, currentMonth + 1).map((cents, i) => {
          const m = firstMonth + i;
          return { key: `m${m}`, label: monthShort(m), fullLabel: monthName(m), cents, current: m === currentMonth };
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
  const selected = bars.find((b) => b.key === picked) ?? bars.find((b) => b.current) ?? bars[bars.length - 1];

  return (
    <section aria-labelledby="chart-title" className="rounded-card bg-card px-5 pt-[1.125rem] pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="chart-title" className="text-xl font-bold tracking-tight">
          {mode === "mes" ? "Por mês" : "Por trimestre"}
        </h2>
        <div className="flex rounded-2xl bg-track p-[3px] text-[0.8125rem] font-semibold" role="group" aria-label="Agrupar por">
          {(["mes", "tri"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setPicked(null);
              }}
              className={`pressable min-h-11 rounded-[0.8125rem] px-3.5 ${mode === m ? "bg-raised text-label shadow-sm" : "text-label-2"}`}
            >
              {m === "mes" ? "Mês" : "Trimestre"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-[0.9375rem] text-label-2">
        <span className="sensitive">{formatReais(total)}</span> em {year}
      </p>
      {/* O valor da barra escolhida, por extenso: o gráfico sozinho não diz quanto foi cada mês. */}
      <p className="mt-0.5 mb-3 text-[0.9375rem] font-semibold" aria-live="polite">
        {selected ? (
          <>
            <span className="capitalize">{selected.fullLabel}</span>: <span className="sensitive">{formatReais(selected.cents)}</span>
          </>
        ) : null}
      </p>

      <div className="flex h-[9.375rem] items-end gap-1.5">
        {bars.map((b, i) => {
          const isSelected = selected?.key === b.key;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setPicked(b.key)}
              aria-pressed={isSelected}
              aria-label={`${b.fullLabel}: ${formatReais(b.cents)}`}
              className={`flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 text-[0.6875rem] font-semibold ${
                isSelected ? "text-label" : "text-label-2"
              }`}
            >
              {isSelected && b.cents > 0 && (
                <span aria-hidden="true" className="sensitive text-[0.6875rem] font-bold whitespace-nowrap">
                  {formatCompact(b.cents)}
                </span>
              )}
              <span
                aria-hidden="true"
                className={`bar-grow privacy-hide block w-full rounded-t-[0.4375rem] rounded-b-[0.1875rem] ${isSelected ? "bg-primary" : "bg-label"}`}
                style={{ height: `${Math.max(3, (b.cents / max) * 100)}%`, opacity: isSelected ? 1 : 0.45, ["--i" as string]: i }}
              />
              <span aria-hidden="true" className={b.current ? "font-bold" : undefined}>
                {b.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
