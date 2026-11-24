import Link from "next/link";
import { CaretRight, ChartLineUp } from "@phosphor-icons/react/dist/ssr";
import type { Dashboard } from "@/core";
import { forecastView } from "@/lib/copy";

/** A previsão em uma frase, como o app Clima: a manchete primeiro, a explicação depois. */
export function Forecast({ dashboard }: { dashboard: Dashboard }) {
  const { headline, body } = forecastView(dashboard);
  return (
    <section aria-labelledby="forecast-title" className="rounded-card bg-card p-5">
      <p className="mb-2.5 flex items-center gap-2.5 text-[0.9375rem] font-semibold text-label-2">
        <span className="grid size-[1.875rem] place-items-center rounded-lg bg-tile text-warn">
          <ChartLineUp size={19} weight="fill" aria-hidden="true" />
        </span>
        Previsão
      </p>
      <h2 id="forecast-title" className="t-title">
        {headline}
      </h2>
      <p className="mt-2 text-[0.96875rem] leading-[1.38] text-label-2">{body}</p>
      <Link
        href="/simular"
        className="mt-4 flex items-center justify-between border-t border-sep pt-3.5 text-[1.1875rem] font-semibold"
      >
        Simular uma venda
        <CaretRight size={17} weight="bold" className="text-label-2" aria-hidden="true" />
      </Link>
    </section>
  );
}
