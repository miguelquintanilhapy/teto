import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Warning } from "@phosphor-icons/react/dist/ssr";
import { formatMoney } from "@/lib/format";
import type { TransactionView } from "@/server/panel";

const SOURCE: Record<TransactionView["source"], string> = {
  nota: "Nota",
  pix: "Pix",
  manual: "Manual",
};

/** Uma linha do histórico. Receita entra com +, despesa com −, e o estado vem sempre escrito. */
export function TransactionRow({ t }: { t: TransactionView }) {
  const income = t.kind === "receita";
  const Icon = income ? ArrowDownLeft : ArrowUpRight;
  const cancelled = t.status === "cancelada";
  const pending = t.status === "pendente";
  const sign = income ? "+" : "−";

  return (
    <li className="relative [&:not(:first-child)]:before:absolute [&:not(:first-child)]:before:top-0 [&:not(:first-child)]:before:right-5 [&:not(:first-child)]:before:left-[4rem] [&:not(:first-child)]:before:h-px [&:not(:first-child)]:before:bg-sep">
      <Link href={`/historico/${t.id}`} className="pressable hoverable flex items-center gap-3.5 px-5 py-3">
      <span className={`grid size-[1.875rem] shrink-0 place-items-center rounded-lg bg-tile ${income ? "text-label" : "text-label-2"}`}>
        <Icon size={18} weight="bold" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`line-clamp-2 text-[1.0625rem] leading-tight font-medium ${cancelled ? "text-label-2 line-through" : ""}`}>{t.description || (income ? "Receita" : "Despesa")}</p>
        <p className="t-sub truncate text-label-2">
          {SOURCE[t.source]} · {t.counterparty}
        </p>
        {pending && (
          <p className="t-caption mt-0.5 flex items-center gap-1 font-semibold text-warn-text">
            <Warning size={13} weight="fill" aria-hidden="true" />
            Para conferir
          </p>
        )}
        {cancelled && <p className="t-caption mt-0.5 text-label-2">Cancelada</p>}
      </div>
      <p className={`sensitive shrink-0 text-[1.0625rem] font-semibold whitespace-nowrap ${cancelled ? "text-label-2 line-through" : ""}`}>
        <span className="sr-only">{income ? "Receita " : "Despesa "}</span>
        {sign} {formatMoney(t.amountCents)}
      </p>
      </Link>
    </li>
  );
}
