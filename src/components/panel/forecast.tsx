import Link from "next/link";
import { CaretRight, ChartLineUp } from "@phosphor-icons/react/dist/ssr";
import type { Dashboard } from "@/core";
import { forecastView, paceLine } from "@/lib/copy";

/** A previsão em uma frase, como o app Clima: a manchete primeiro, a explicação depois. */
export function Forecast({ dashboard, openingDate }: { dashboard: Dashboard; openingDate: string | null }) {
  const { headline, body } = forecastView(dashboard, openingDate);
  const pace = paceLine(dashboard, openingDate);
  return (
    <section aria-labelledby="forecast-title" className="rounded-card bg-card p-5">
      <p className="mb-2.5 flex items-center gap-2.5 text-[0.9375rem] font-semibold text-label-2">
        <span className="grid size-[1.875rem] place-items-center rounded-lg bg-tile text-label">
          <ChartLineUp size={19} weight="fill" aria-hidden="true" />
        </span>
        Previsão
      </p>
      <h2 id="forecast-title" className="t-title">
        {headline}
      </h2>
      <p className="sensitive mt-2 text-[0.96875rem] leading-[1.38] text-label-2">{body}</p>
      {pace && <p className="t-sub sensitive mt-1.5 text-label-2">{pace}</p>}
      <Link
        href="/simular"
        className="pressable hoverable -mx-2 mt-3 flex min-h-12 items-center justify-between rounded-xl border-t border-sep px-2 pt-2 text-[1.1875rem] font-semibold text-action"
      >
        Simular uma venda
        <CaretRight size={17} weight="bold" className="text-action" aria-hidden="true" />
      </Link>
    </section>
  );
}
