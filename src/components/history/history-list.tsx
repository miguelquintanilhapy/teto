"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatDayMonth } from "@/lib/format";
import type { TransactionView } from "@/server/panel";
import { TransactionRow } from "./transaction-row";

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "pendente", label: "Para conferir" },
  { id: "receita", label: "Receitas" },
  { id: "despesa", label: "Despesas" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const isFilter = (v: unknown): v is FilterId => FILTERS.some((f) => f.id === v);

function applyFilter(list: TransactionView[], filter: FilterId): TransactionView[] {
  switch (filter) {
    case "pendente":
      return list.filter((t) => t.status === "pendente");
    case "receita":
      return list.filter((t) => t.kind === "receita");
    case "despesa":
      return list.filter((t) => t.kind === "despesa");
    default:
      return list;
  }
}

/**
 * Lista com filtro no próprio navegador: trocar de filtro não pede nada ao servidor,
 * e a página inteira continua estática (o que deixa a troca de abas instantânea).
 * Um link como /historico?status=pendente ainda abre já filtrado.
 */
export function HistoryList({ transactions }: { transactions: TransactionView[] }) {
  const initial = useSearchParams().get("status");
  const [filter, setFilter] = useState<FilterId>(isFilter(initial) ? initial : "todas");

  const list = applyFilter(transactions, filter);
  const groups = new Map<string, TransactionView[]>();
  for (const t of list) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);

  return (
    <>
      <div role="group" aria-label="Filtrar" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-[0.9375rem] font-semibold ${
                active ? "bg-primary text-on-primary" : "bg-card text-label"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="rounded-card bg-card p-5">
          <h2 className="t-headline">Nada por aqui</h2>
          <p className="t-body mt-1 text-label-2">
            {filter === "pendente" ? "Nenhuma nota aguardando conferência." : "Nenhum lançamento nesta lista ainda."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {[...groups.entries()].map(([date, items]) => (
            <section key={date} aria-labelledby={`d-${date}`}>
              <h2 id={`d-${date}`} className="mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">
                {formatDayMonth(date)}
              </h2>
              <ul className="overflow-hidden rounded-card bg-card">
                {items.map((t) => (
                  <TransactionRow key={t.id} t={t} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
