import Link from "next/link";
import { ArrowSquareOut, CalendarBlank, SealCheck, Warning } from "@phosphor-icons/react/dist/ssr";
import { IconTile } from "@/components/icon-tile";
import type { Dashboard } from "@/core";
import { dasCompetence, daysUntilLabel, pendingAria } from "@/lib/copy";
import { formatShortDate } from "@/lib/format";
import { PGMEI_URL } from "@/lib/links";

/** Com o vencimento a cinco dias ou menos, o DAS ganha o âmbar de atenção (nunca vermelho: o app não sabe se atrasou). */
const DAS_SOON_DAYS = 5;

/** Duas informações que pedem ação ou prazo: o DAS e as notas aguardando conferência. */
export function Bento({ dashboard }: { dashboard: Dashboard }) {
  const { das, pendingCount } = dashboard;
  const dasSoon = das.daysUntil <= DAS_SOON_DAYS;
  const notesLabel = (
    <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-label-2">
      {/* Nada esperando é confirmação (verde); notas esperando são tarefa, então o azul do que se toca. */}
      <IconTile tone={pendingCount > 0 ? "action" : "ok"}>
        <SealCheck size={19} weight="fill" aria-hidden="true" />
      </IconTile>
      Notas
    </p>
  );
  return (
    <div className="grid grid-cols-2 gap-3">
      <section aria-label="Próximo DAS" className="flex min-h-[8.25rem] flex-col justify-between rounded-card bg-card p-4">
        <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-label-2">
          <IconTile tone={dasSoon ? "warn" : "tax"}>
            <CalendarBlank size={19} weight="fill" aria-hidden="true" />
          </IconTile>
          DAS
        </p>
        <div>
          <p className="text-[1.875rem] leading-none font-extrabold tracking-tight">{formatShortDate(das.nextDueDate)}</p>
          <p className={`t-caption mt-1 flex items-center gap-1 ${dasSoon ? "font-semibold text-warn-text" : "text-label-2"}`}>
            {dasSoon && <Warning size={13} weight="fill" aria-hidden="true" className="shrink-0" />}
            {daysUntilLabel(das.daysUntil)} · ref. {dasCompetence(das.nextDueDate).slice(0, 3)}
          </p>
          <a
            href={PGMEI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable -mx-1 mt-0.5 inline-flex min-h-11 items-center gap-1 px-1 text-[0.9375rem] font-semibold text-action"
          >
            Gerar guia
            <ArrowSquareOut size={15} weight="bold" aria-hidden="true" />
            <span className="sr-only">(abre o portal do Simples Nacional)</span>
          </a>
        </div>
      </section>
      {pendingCount > 0 ? (
        <Link
          href="/historico?status=pendente"
          aria-label={pendingAria(pendingCount)}
          className="pressable flex min-h-[8.25rem] flex-col justify-between rounded-card bg-card p-4"
        >
          {notesLabel}
          <div>
            <p className="text-[1.875rem] leading-none font-extrabold tracking-tight">{pendingCount}</p>
            <p className="t-caption mt-1 text-label-2">para você conferir</p>
          </div>
        </Link>
      ) : (
        // Sem nada para conferir, o cartão não leva a uma lista vazia: só diz que está em dia.
        <section aria-label="Notas" className="flex min-h-[8.25rem] flex-col justify-between rounded-card bg-card p-4">
          {notesLabel}
          <div>
            <p className="text-[1.375rem] leading-tight font-extrabold tracking-tight text-ok-text">Tudo conferido</p>
            <p className="t-caption mt-1 text-label-2">nenhuma nota esperando</p>
          </div>
        </section>
      )}
    </div>
  );
}
