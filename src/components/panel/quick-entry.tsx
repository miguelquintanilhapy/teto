import Link from "next/link";
import { ArrowUp, PencilSimple } from "@phosphor-icons/react/dist/ssr";

/** Atalho para quem não tem nota: leva ao formulário de lançamento manual. */
export function QuickEntry() {
  return (
    <section aria-labelledby="quick-title" className="rounded-card bg-card p-4">
      <h2 id="quick-title" className="mb-3 flex items-center gap-2.5 text-[0.9375rem] font-semibold text-label-2">
        <span className="grid size-[1.875rem] place-items-center rounded-lg bg-tile text-label">
          <PencilSimple size={19} weight="fill" aria-hidden="true" />
        </span>
        Lançar sem nota
      </h2>
      <Link href="/lancar" className="pressable flex min-h-[3.25rem] items-center gap-2.5 rounded-[1.625rem] bg-track py-1.5 pr-1.5 pl-[1.125rem]">
        <span className="flex-1 text-[1.0625rem] text-label-2">Informe valor, data e tipo</span>
        <span className="grid size-10 place-items-center rounded-full bg-primary text-on-primary">
          <ArrowUp size={20} weight="bold" aria-hidden="true" />
        </span>
      </Link>
      <p className="t-sub mt-2.5 px-1 text-label-2">Você confere antes de somar ao limite.</p>
    </section>
  );
}
