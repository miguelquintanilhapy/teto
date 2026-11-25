import { CaretDown, Info } from "@phosphor-icons/react/dist/ssr";
import type { Dashboard } from "@/core";
import { limitExplainer } from "@/lib/copy";

/**
 * "O que acontece se eu passar?" no mesmo lugar em que o número aparece, sem mandar o usuário ao Perfil.
 * Fechado por padrão: quem já sabe não paga com a tela, quem não sabe abre com um toque.
 */
export function LimitExplainer({ dashboard, openingDate }: { dashboard: Dashboard; openingDate: string | null }) {
  const rows = limitExplainer(dashboard, openingDate);
  return (
    <details className="group rounded-card bg-card">
      <summary className="pressable flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-card px-5 py-3 text-[1.0625rem] font-semibold [&::-webkit-details-marker]:hidden">
        <span className="grid size-[1.875rem] place-items-center rounded-lg bg-tile text-label">
          <Info size={19} weight="fill" aria-hidden="true" />
        </span>
        <span className="flex-1">Entenda o limite</span>
        <CaretDown size={17} weight="bold" className="text-label-2 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="px-5 pb-4">
        <dl className="divide-y divide-sep">
          {rows.map((r) => (
            <div key={r.title} className="py-3 first:pt-0">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="t-row">{r.title}</dt>
                <dd className="sensitive shrink-0 text-[1.0625rem] font-semibold">{r.value}</dd>
              </div>
              <p className="t-sub mt-0.5 text-label-2">{r.text}</p>
            </div>
          ))}
        </dl>
        <p className="t-sub mt-1 text-label-2">
          Só receita conta para o limite. Confirme as regras no Portal do Empreendedor ou com seu contador.
        </p>
      </div>
    </details>
  );
}
