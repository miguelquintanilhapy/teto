"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Bank, CaretLeft, CaretRight, MagnifyingGlass, XCircle } from "@phosphor-icons/react/dist/ssr";
import { suspectedDuplicates } from "@/lib/duplicates";
import { formatDayMonth, formatMoney, formatReais } from "@/lib/format";
import { historyMonths, monthTitle, searchHistory, totals } from "@/lib/history";
import type { TransactionView } from "@/server/panel";
import { TransactionRow } from "./transaction-row";

const FILTERS = [
  { id: "todas", label: "Todos" },
  { id: "receita", label: "Receitas" },
  { id: "despesa", label: "Despesas" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const isFilter = (v: unknown): v is FilterId => FILTERS.some((f) => f.id === v);

/**
 * O histórico do ano, mês a mês, com o resumo do mês, busca e filtro. Tudo roda no navegador: trocar de mês, de
 * filtro ou buscar não pede nada ao servidor, e a página continua estática (a troca de abas fica instantânea).
 * Um link como /historico?status=receita ainda abre já filtrado.
 */
export function HistoryList({ transactions, today, openingDate }: { transactions: TransactionView[]; today: string; openingDate: string | null }) {
  const initial = useSearchParams().get("status");
  const [filter, setFilterState] = useState<FilterId>(isFilter(initial) ? initial : "todas");
  const months = historyMonths(today, openingDate);
  const [month, setMonth] = useState(months[months.length - 1]!);
  const [query, setQuery] = useState("");
  // Cancelados já estão fora do limite: ficam escondidos até o usuário pedir.
  const [showCancelled, setShowCancelled] = useState(false);

  // O filtro vai para o endereço sem navegar: sobrevive ao recarregar e ao compartilhar o link.
  function setFilter(next: FilterId) {
    setFilterState(next);
    const url = next === "todas" ? "/historico" : `/historico?status=${next}`;
    window.history.replaceState(window.history.state, "", url);
  }

  const searching = query.trim() !== "";
  const monthIndex = months.indexOf(month);
  // Buscando, a busca vale para o ano todo; sem busca, a lista é a do mês escolhido.
  const scope = searching ? searchHistory(transactions, query) : transactions.filter((t) => t.date.startsWith(month));
  const monthTotals = totals(scope);
  const filtered = filter === "todas" ? scope : scope.filter((t) => t.kind === filter);
  // Cancelados ficam fora dos dias: quando pedidos, aparecem num grupo próprio logo abaixo do botão, onde o toque foi.
  const cancelled = filtered.filter((t) => t.status === "cancelada");
  const cancelledCount = cancelled.length;
  const list = filtered.filter((t) => t.status !== "cancelada");
  const duplicates = suspectedDuplicates(transactions);
  const groups = new Map<string, TransactionView[]>();
  for (const t of list) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-card bg-card p-5">
        <h2 className="t-headline">Nada por aqui ainda</h2>
        <p className="t-body mt-1 text-label-2">Cada nota que você enviar e confirmar aparece aqui, separada por mês.</p>
        <Link href="/enviar" className="pressable mt-4 flex h-12 items-center justify-center rounded-full bg-primary text-[1.0625rem] font-bold text-on-primary">
          Enviar a primeira nota
        </Link>
      </div>
    );
  }

  return (
    <>
      <label className="flex min-h-11 items-center gap-2.5 rounded-2xl bg-card px-3.5 focus-within:outline-2 focus-within:outline-primary">
        <MagnifyingGlass size={19} weight="bold" className="shrink-0 text-label-2" aria-hidden="true" />
        <span className="sr-only">Buscar lançamentos por descrição, valor ou CNPJ</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar lançamentos"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[1.0625rem] outline-none placeholder:text-label-2 [&::-webkit-search-cancel-button]:hidden"
        />
        {searching && (
          <button type="button" onClick={() => setQuery("")} className="pressable -mr-1.5 grid size-9 shrink-0 place-items-center text-label-2">
            <XCircle size={20} weight="fill" aria-hidden="true" />
            <span className="sr-only">Limpar a busca</span>
          </button>
        )}
      </label>

      <div role="radiogroup" aria-label="Mostrar" className="relative mt-3 grid grid-cols-3 rounded-2xl bg-track p-[3px] text-[0.9375rem] font-semibold">
        {/* O marcador desliza de uma opção à outra, como o seletor de tema e a barra de abas. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-[0.8125rem] bg-raised shadow-sm motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.3,0.9,0.3,1)]"
          style={{ transform: `translateX(${FILTERS.findIndex((f) => f.id === filter) * 100}%)` }}
        />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={f.id === filter}
            onClick={() => setFilter(f.id)}
            className={`pressable relative min-h-11 min-w-0 truncate rounded-[0.8125rem] px-1 py-2.5 ${f.id === filter ? "text-label" : "text-label-2"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {searching ? (
        <p role="status" className="t-sub mt-4 px-1 text-label-2">
          {list.length === 0 ? `Nada encontrado para “${query.trim()}” em ${today.slice(0, 4)}.` : `${list.length} ${list.length === 1 ? "resultado" : "resultados"} em ${today.slice(0, 4)}`}
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMonth(months[monthIndex - 1]!)}
              disabled={monthIndex <= 0}
              className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-card disabled:opacity-35"
            >
              <CaretLeft size={18} weight="bold" aria-hidden="true" />
              <span className="sr-only">Mês anterior</span>
            </button>
            <h2 aria-live="polite" className="t-row text-center font-semibold">
              {monthTitle(month)}
            </h2>
            <button
              type="button"
              onClick={() => setMonth(months[monthIndex + 1]!)}
              disabled={monthIndex >= months.length - 1}
              className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-card disabled:opacity-35"
            >
              <CaretRight size={18} weight="bold" aria-hidden="true" />
              <span className="sr-only">Próximo mês</span>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-card px-4 py-3">
              <p className="t-sub text-label-2">Receitas</p>
              <p className="sensitive mt-0.5 text-[1.1875rem] font-bold">{formatReais(monthTotals.incomeCents)}</p>
            </div>
            <div className="rounded-2xl bg-card px-4 py-3">
              <p className="t-sub text-label-2">Despesas</p>
              <p className="sensitive mt-0.5 text-[1.1875rem] font-bold">{formatReais(monthTotals.expenseCents)}</p>
            </div>
          </div>
          {/* A conciliação com o banco: o nome diz para que serve, e não só "comparar extrato". */}
          <Link href="/extrato" className="pressable hoverable mt-2.5 flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[0.625rem] bg-tile">
              <Bank size={20} weight="fill" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[1rem] leading-tight font-semibold text-action">Conferir extrato do banco</span>
              <span className="t-sub mt-0.5 block text-label-2">Ache vendas que faltam no Teto</span>
            </span>
            <CaretRight size={17} weight="bold" className="shrink-0 text-label-2" aria-hidden="true" />
          </Link>
        </>
      )}

      {list.length === 0 && !searching ? (
        <p className="t-body mt-5 rounded-card bg-card p-5 text-label-2">
          {filter === "todas" ? "Nenhum lançamento neste mês." : `Nenhuma ${filter === "receita" ? "receita" : "despesa"} neste mês.`}
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          {[...groups.entries()].map(([date, items]) => {
            const day = totals(items);
            const net = day.incomeCents - day.expenseCents;
            return (
              <section key={date} aria-labelledby={`d-${date}`}>
                <div className="mb-2 flex items-baseline justify-between gap-3 px-5">
                  <h3 id={`d-${date}`} className="text-[0.9375rem] font-semibold text-label-2">
                    {formatDayMonth(date)}
                  </h3>
                  {items.some((t) => t.status !== "cancelada") && (
                    <p className="sensitive text-[0.875rem] font-semibold whitespace-nowrap text-label-2">
                      <span className="sr-only">Saldo do dia: </span>
                      {net >= 0 ? "+" : "−"} {formatMoney(Math.abs(net))}
                    </p>
                  )}
                </div>
                <ul className="overflow-hidden rounded-card bg-card">
                  {items.map((t) => (
                    <TransactionRow key={t.id} t={t} duplicate={duplicates.has(t.id)} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {cancelledCount > 0 && (
        <button
          type="button"
          onClick={() => setShowCancelled((v) => !v)}
          aria-expanded={showCancelled}
          className="pressable mx-auto mt-5 flex min-h-11 items-center px-4 text-[0.9375rem] font-semibold text-action"
        >
          {showCancelled ? "Ocultar cancelados" : `Mostrar ${cancelledCount} ${cancelledCount === 1 ? "cancelado" : "cancelados"}`}
        </button>
      )}
      {cancelledCount > 0 && showCancelled && (
        <section aria-labelledby="cancelados" className="mt-2">
          <h3 id="cancelados" className="mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">
            Cancelados <span className="font-normal">· não contam no limite</span>
          </h3>
          <ul className="overflow-hidden rounded-card bg-card">
            {cancelled.map((t) => (
              <TransactionRow key={t.id} t={t} showDate />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
