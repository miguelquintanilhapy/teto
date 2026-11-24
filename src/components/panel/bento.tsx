import Link from "next/link";
import { CalendarBlank, SealCheck } from "@phosphor-icons/react/dist/ssr";
import type { Dashboard } from "@/core";
import { daysUntilLabel, pendingLabel } from "@/lib/copy";
import { formatShortDate } from "@/lib/format";

function Tile({ children }: { children: React.ReactNode }) {
  return <span className="grid size-[1.875rem] place-items-center rounded-lg bg-tile text-label">{children}</span>;
}

/** Duas informações que pedem ação ou prazo: o DAS e as notas aguardando conferência. */
export function Bento({ dashboard }: { dashboard: Dashboard }) {
  const { das, pendingCount } = dashboard;
  return (
    <div className="grid grid-cols-2 gap-3">
      <section aria-label="Próximo DAS" className="flex min-h-[8.25rem] flex-col justify-between rounded-card bg-card p-4">
        <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-label-2">
          <Tile>
            <CalendarBlank size={19} weight="fill" aria-hidden="true" />
          </Tile>
          DAS
        </p>
        <div>
          <p className="text-[1.875rem] leading-none font-extrabold tracking-tight">{formatShortDate(das.nextDueDate)}</p>
          <p className="t-caption mt-1 text-label-2">{daysUntilLabel(das.daysUntil)}</p>
        </div>
      </section>
      <Link
        href="/historico?status=pendente"
        aria-label={`${pendingCount} ${pendingCount === 1 ? "nota" : "notas"}: ${pendingLabel(pendingCount)}`}
        className="pressable flex min-h-[8.25rem] flex-col justify-between rounded-card bg-card p-4"
      >
        <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-label-2">
          <Tile>
            <SealCheck size={19} weight="fill" aria-hidden="true" />
          </Tile>
          Notas
        </p>
        <div>
          <p className="text-[1.875rem] leading-none font-extrabold tracking-tight">{pendingCount}</p>
          <p className="t-caption mt-1 text-label-2">{pendingLabel(pendingCount)}</p>
        </div>
      </Link>
    </div>
  );
}
