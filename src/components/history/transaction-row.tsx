import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Warning } from "@phosphor-icons/react/dist/ssr";
import { formatMoney, formatShortDate } from "@/lib/format";
import { displayTitle } from "@/lib/history";
import type { TransactionView } from "@/server/panel";

const SOURCE: Record<TransactionView["source"], string> = {
  nota: "Nota",
  pix: "Pix",
  manual: "Manual",
};

/**
 * Uma linha do histórico. Receita entra com +, despesa com −, e o estado vem sempre escrito.
 * A linha mostra só o que se lê de relance (descrição, tipo, origem, valor); CPF/CNPJ mascarado fica no detalhe.
 */
/** `showDate`: a linha fora do grupo do dia (como no grupo de cancelados) mostra a data no subtítulo. */
export function TransactionRow({ t, duplicate = false, showDate = false }: { t: TransactionView; duplicate?: boolean; showDate?: boolean }) {
  const income = t.kind === "receita";
  const Icon = income ? ArrowDownLeft : ArrowUpRight;
  const cancelled = t.status === "cancelada";
  const pending = t.status === "pendente";
  const sign = income ? "+" : "−";
  const kindLabel = income ? "Receita" : "Despesa";
  const title = displayTitle(t.description);

  return (
    <li className="relative [&:not(:first-child)]:before:absolute [&:not(:first-child)]:before:top-0 [&:not(:first-child)]:before:right-5 [&:not(:first-child)]:before:left-[4.375rem] [&:not(:first-child)]:before:h-px [&:not(:first-child)]:before:bg-sep">
      <Link href={`/historico/${t.id}`} className="pressable hoverable flex items-center gap-3.5 px-5 py-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-[0.625rem] bg-tile ${income ? "text-label" : "text-label-2"}`}>
          <Icon size={19} weight="bold" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          {/* Sem descrição, o título vira o tipo: o cinza fazia a linha parecer desabilitada. */}
          <p className={`line-clamp-2 text-[1.0625rem] leading-tight font-medium ${cancelled ? "text-label-2 line-through" : ""}`}>{title || kindLabel}</p>
          <p className="t-sub mt-0.5 truncate text-label-2">
            {showDate && `${formatShortDate(t.date)} · `}
            {title ? `${kindLabel} · ${SOURCE[t.source]}` : SOURCE[t.source]}
          </p>
          {pending && (
            <p className="t-caption mt-0.5 flex items-center gap-1 font-semibold text-warn-text">
              <Warning size={13} weight="fill" aria-hidden="true" />
              Para conferir
            </p>
          )}
          {duplicate && !cancelled && (
            <p className="t-caption mt-0.5 flex items-center gap-1 font-semibold text-warn-text">
              <Warning size={13} weight="fill" aria-hidden="true" />
              Possível duplicidade
            </p>
          )}
          {cancelled && !showDate && <p className="t-caption mt-0.5 text-label-2">Cancelada</p>}
        </div>
        <p className={`sensitive shrink-0 text-[1.0625rem] font-semibold whitespace-nowrap ${cancelled ? "text-label-2 line-through" : ""}`}>
          <span className="sr-only">{kindLabel} </span>
          {sign} {formatMoney(t.amountCents)}
        </p>
      </Link>
    </li>
  );
}
