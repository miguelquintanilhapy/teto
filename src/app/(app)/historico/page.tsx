import Link from "next/link";
import { Suspense } from "react";
import { TransactionRow } from "@/components/history/transaction-row";
import { formatDayMonth } from "@/lib/format";
import { getTransactionsDeps } from "@/server/composition";
import { loadPanel, type TransactionView } from "@/server/panel";

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

export default function HistoricoPage({ searchParams }: PageProps<"/historico">) {
  return (
    <main>
      <h1 className="t-large-title mt-2 mb-3">Histórico</h1>
      <Suspense fallback={<div aria-busy="true" className="h-64 rounded-card bg-card" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/historico">["searchParams"] }) {
  const raw = (await searchParams).status;
  const filter: FilterId = isFilter(raw) ? raw : "todas";

  let panel;
  try {
    panel = await loadPanel(getTransactionsDeps());
  } catch (e) {
    console.error("histórico: falha ao carregar", e instanceof Error ? e.message.slice(0, 200) : "erro desconhecido");
    return (
      <div role="alert" className="rounded-card bg-card p-5">
        <h2 className="t-headline">Não foi possível carregar o histórico</h2>
        <p className="t-body mt-1 text-label-2">Tente de novo em instantes.</p>
      </div>
    );
  }
  if (!panel) {
    return (
      <div role="alert" className="rounded-card bg-card p-5">
        <h2 className="t-headline">Perfil de demonstração não encontrado</h2>
        <p className="t-body mt-1 text-label-2">Rode npm run seed para criar os dados de demonstração.</p>
      </div>
    );
  }

  const list = applyFilter(panel.transactions, filter);
  const groups = new Map<string, TransactionView[]>();
  for (const t of list) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);

  return (
    <>
      <nav aria-label="Filtrar" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <Link
              key={f.id}
              href={f.id === "todas" ? "/historico" : `/historico?status=${f.id}`}
              aria-current={active ? "true" : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-[0.9375rem] font-semibold ${
                active ? "bg-primary text-on-primary" : "bg-card text-label"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

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
