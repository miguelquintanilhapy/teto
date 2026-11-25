"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { suspectedDuplicates } from "@/lib/duplicates";
import { formatDayMonth } from "@/lib/format";
import type { TransactionView } from "@/server/panel";
import { TransactionRow } from "./transaction-row";

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "pendente", label: "Conferir" },
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
  const [filter, setFilterState] = useState<FilterId>(isFilter(initial) ? initial : "todas");
  // Cancelados já estão fora do limite: ficam escondidos até o usuário pedir.
  const [showCancelled, setShowCancelled] = useState(false);

  // O filtro vai para o endereço sem navegar: sobrevive ao recarregar e ao compartilhar o link.
  function setFilter(next: FilterId) {
    setFilterState(next);
    const url = next === "todas" ? "/historico" : `/historico?status=${next}`;
    window.history.replaceState(window.history.state, "", url);
  }

  const filtered = applyFilter(transactions, filter);
  const cancelledCount = filtered.filter((t) => t.status === "cancelada").length;
  const list = showCancelled ? filtered : filtered.filter((t) => t.status !== "cancelada");
  const duplicates = suspectedDuplicates(transactions);
  const groups = new Map<string, TransactionView[]>();
  for (const t of list) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);

  return (
    <>
      <div role="group" aria-label="Filtrar" className="mb-4 grid grid-cols-4 gap-2">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.id)}
              className={`pressable hoverable min-h-11 min-w-0 truncate rounded-full px-2 py-2 text-[0.875rem] font-semibold ${
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
          {filter === "todas" && (
            <Link href="/enviar" className="pressable mt-4 flex h-12 items-center justify-center rounded-full bg-primary text-[1.0625rem] font-bold text-on-primary">
              Enviar a primeira nota
            </Link>
          )}
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
                  <TransactionRow key={t.id} t={t} duplicate={duplicates.has(t.id)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {cancelledCount > 0 && (
        <button
          type="button"
          onClick={() => setShowCancelled((v) => !v)}
          className="pressable mx-auto mt-5 flex min-h-11 items-center px-4 text-[0.9375rem] font-semibold text-action"
        >
          {showCancelled ? "Ocultar cancelados" : `Mostrar ${cancelledCount} ${cancelledCount === 1 ? "cancelado" : "cancelados"}`}
        </button>
      )}
    </>
  );
}
