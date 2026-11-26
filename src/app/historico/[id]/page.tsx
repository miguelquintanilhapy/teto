import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoProfile } from "@/components/no-profile";
import { TransactionActions } from "@/components/history/transaction-actions";
import { SheetShell } from "@/components/send/sheet-shell";
import { formatFullShortDate, formatMoney } from "@/lib/format";
import { describeEvent, limitImpact, sourceLabel, STATUS_LABEL } from "@/lib/transaction-detail";
import { getTransactionEvents } from "@/server/panel-cache";
import { loadPanelSafe } from "@/server/panel-safe";
import type { TransactionEvent } from "@/server/transactions/service";

export const metadata = { title: "Lançamento · Teto" };

export default function DetalhePage({ params }: PageProps<"/historico/[id]">) {
  return (
    <SheetShell title="Lançamento" closeHref="/historico">
      <Suspense fallback={<DetalheSkeleton />}>
        <Conteudo params={params} />
      </Suspense>
    </SheetShell>
  );
}

/** Esqueleto com a forma do conteúdo: o cartão do valor e a lista de dados. */
function DetalheSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando o lançamento" className="animate-pulse motion-reduce:animate-none">
      <div className="h-44 rounded-card bg-card" />
      <div className="mt-8 h-52 rounded-card bg-card" />
    </div>
  );
}

/** Rótulo e valor lado a lado; valor longo (CNPJ, descrição) desce para a linha de baixo, alinhado à esquerda. */
function Row({ label, value, nowrap = false }: { label: string; value: string; nowrap?: boolean }) {
  const stacked = value.length > 22;
  return stacked ? (
    <div className="px-5 py-3.5">
      <p className="t-sub text-label-2">{label}</p>
      <p className={`mt-0.5 text-[1.0625rem] ${nowrap ? "whitespace-nowrap" : ""}`}>{value}</p>
    </div>
  ) : (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3.5">
      <p className="text-[1.0625rem] shrink-0">{label}</p>
      <p className={`min-w-0 text-right text-[1.0625rem] text-label-2 ${nowrap ? "whitespace-nowrap" : ""}`}>{value}</p>
    </div>
  );
}

/** "24 nov 2026, 16:54", no fuso de Brasília: o mesmo formato de data do resto do app. */
function stamp(iso: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return `${formatFullShortDate(`${p.year}-${p.month}-${p.day}`)}, ${p.hour}:${p.minute}`;
}

async function Conteudo({ params }: { params: PageProps<"/historico/[id]">["params"] }) {
  const { id } = await params;
  const r = await loadPanelSafe("detalhe");
  if (!r.ok) {
    return r.reason === "no_profile" ? (
      <NoProfile />
    ) : (
      <p role="alert" className="t-body rounded-card bg-card p-5">
        Não foi possível carregar o lançamento. Tente de novo em instantes.
      </p>
    );
  }
  const t = r.panel.transactions.find((x) => x.id === id);
  if (!t) notFound();

  let events: TransactionEvent[] = [];
  try {
    events = await getTransactionEvents(id);
  } catch (e) {
    console.error("detalhe: histórico indisponível", e instanceof Error ? e.message.slice(0, 200) : "erro");
  }

  const impact = limitImpact(t);
  const income = t.kind === "receita";

  return (
    <>
      <section className="rounded-card bg-card p-5 text-center">
        {/* O título é o que foi vendido ou comprado: é por isso que a pessoa reconhece o lançamento. */}
        <h2 className={`line-clamp-3 text-[1.25rem] leading-tight font-bold ${t.description ? "" : "text-label-2"}`}>{t.description || "Sem descrição"}</h2>
        <p className="t-sub mt-1 text-label-2">
          {income ? "Receita" : "Despesa"} · {STATUS_LABEL[t.status]}
        </p>
        <p className={`sensitive t-display mt-2 ${t.status === "cancelada" ? "text-label-2 line-through" : ""}`}>
          {income ? "+ " : "− "}
          {formatMoney(t.amountCents)}
        </p>
        <p className={`mt-3 text-[0.9375rem] font-semibold ${impact.counts ? "text-label" : "text-label-2"}`}>{impact.reason}</p>
      </section>

      <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Dados</h2>
      <div className="divide-y divide-sep rounded-card bg-card">
        <Row label="Data" value={formatFullShortDate(t.date)} />
        {t.issueDate && t.issueDate !== t.date && <Row label="Emissão" value={formatFullShortDate(t.issueDate)} />}
        <Row label="Origem" value={sourceLabel(t.source)} />
        <Row label={income ? "Cliente" : "Fornecedor"} value={t.counterparty} nowrap />
        {t.accessKeySuffix && <Row label="Chave de acesso" value={`…${t.accessKeySuffix}`} />}
        {t.confidence !== null && <Row label="Leitura" value="Pela IA, conferida por você" />}
      </div>

      {events.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Histórico de alterações</h2>
          <ol className="divide-y divide-sep rounded-card bg-card">
            {events.map((e, i) => {
              const d = describeEvent(e);
              return (
                <li key={`${e.createdAt}-${i}`} className="px-5 py-3.5">
                  <p className="text-[1.0625rem] font-medium">{d.title}</p>
                  <p className="t-sub text-label-2">{stamp(e.createdAt)}</p>
                  {d.lines.map((line) => (
                    <p key={line} className="t-sub mt-1">
                      {line}
                    </p>
                  ))}
                </li>
              );
            })}
          </ol>
        </>
      )}

      {t.status !== "cancelada" && (
        <TransactionActions
          t={{ id: t.id, amountCents: t.amountCents, date: t.date, description: t.description, counts: impact.counts }}
          today={r.panel.today}
        />
      )}
    </>
  );
}
