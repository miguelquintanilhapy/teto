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
      <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Conteudo params={params} />
      </Suspense>
    </SheetShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <p className="t-row shrink-0">{label}</p>
      <p className="t-row min-w-0 text-right text-label-2">{value}</p>
    </div>
  );
}

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

async function Conteudo({ params }: { params: PageProps<"/historico/[id]">["params"] }) {
  const { id } = await params;
  const r = await loadPanelSafe("detalhe");
  if (!r.ok) {
    return (
      <>
        {r.reason === "no_profile" ? (
          <NoProfile />
        ) : (
          <p role="alert" className="t-body rounded-card bg-card p-5">
            Não foi possível carregar o lançamento. Tente de novo em instantes.
          </p>
        )}
      </>
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
        <p className="t-sub text-label-2">{income ? "Receita" : "Despesa"} · {STATUS_LABEL[t.status]}</p>
        <p className={`sensitive t-display mt-1 ${t.status === "cancelada" ? "text-label-2 line-through" : ""}`}>
          {income ? "+ " : "− "}
          {formatMoney(t.amountCents)}
        </p>
        <p className={`mt-3 text-[0.9375rem] font-semibold ${impact.counts ? "text-ok-text" : "text-label-2"}`}>{impact.reason}</p>
      </section>

      <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Dados</h2>
      <div className="divide-y divide-sep rounded-card bg-card">
        <Row label="Data" value={formatFullShortDate(t.date)} />
        {t.issueDate && t.issueDate !== t.date && <Row label="Emissão" value={formatFullShortDate(t.issueDate)} />}
        <Row label="Origem" value={sourceLabel(t.source)} />
        <Row label={income ? "Cliente" : "Fornecedor"} value={t.counterparty} />
        <Row label="Descrição" value={t.description || "Sem descrição"} />
        {t.accessKeySuffix && <Row label="Chave de acesso" value={`…${t.accessKeySuffix}`} />}
        {t.confidence !== null && <Row label="Confiança da IA" value={`${Math.round(t.confidence * 100)}%`} />}
      </div>

      {events.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Histórico de alterações</h2>
          <ol className="divide-y divide-sep rounded-card bg-card">
            {events.map((e, i) => {
              const d = describeEvent(e);
              return (
                <li key={`${e.createdAt}-${i}`} className="px-5 py-3.5">
                  <p className="t-row">{d.title}</p>
                  <p className="t-sub text-label-2">{dateTime.format(new Date(e.createdAt))}</p>
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
