import { Suspense } from "react";
import { BellRinging, CheckCircle, Clock, Circle } from "@phosphor-icons/react/dist/ssr";
import { rulesFor, type AlertKind } from "@/core";
import { SheetShell } from "@/components/send/sheet-shell";
import { formatFullShortDate, formatPercent } from "@/lib/format";
import { getAlertsOverview } from "@/server/alerts/overview";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Alertas · Teto" };

export default function AlertasPage() {
  return (
    <SheetShell title="Alertas" closeHref="/perfil">
      <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Conteudo />
      </Suspense>
    </SheetShell>
  );
}

async function Conteudo() {
  const r = await loadPanelSafe("alertas");
  let overview;
  try {
    overview = await getAlertsOverview();
  } catch (e) {
    console.error("alertas: falha ao carregar", e instanceof Error ? e.message.slice(0, 200) : "erro desconhecido");
    overview = null;
  }
  if (!r.ok || !overview) {
    return (
      <p role="alert" className="t-body rounded-card bg-card p-5">
        {r.ok || r.reason === "error" ? "Não foi possível carregar os alertas. Tente de novo em instantes." : "Cadastre o MEI para receber alertas."}
      </p>
    );
  }

  const cfg = rulesFor(overview.year);
  const due = new Set<AlertKind>(r.panel.dashboard.alerts);
  const stored = new Map(overview.rows.map((a) => [a.kind, a]));

  const bands: Array<{ kind: AlertKind; title: string; text: string }> = [
    { kind: "threshold_warning", title: `${formatPercent(cfg.warningRatio)} do limite`, text: "Atenção: ainda dá tempo de planejar." },
    { kind: "threshold_critical", title: `${formatPercent(cfg.criticalRatio)} do limite`, text: "Crítico: simule antes de aceitar vendas grandes." },
    { kind: "over_limit", title: "Passou do limite", text: "Você segue MEI até 20% acima, mas é desenquadrado em janeiro." },
    { kind: "over_tolerance", title: `Passou de ${formatPercent(1 + cfg.toleranceRate)}`, text: "Desenquadramento retroativo. Procure um contador." },
  ];

  return (
    <>
      <section className="rounded-card bg-card p-5">
        <span className="grid size-14 place-items-center rounded-2xl bg-tile">
          <BellRinging size={30} weight="fill" aria-hidden="true" />
        </span>
        <h2 className="t-title mt-3">Aviso antes de estourar</h2>
        <p className="t-body mt-2 text-label-2">
          O Teto manda um e-mail quando você cruza cada faixa do limite, uma vez por faixa e por ano. Se várias faixas forem cruzadas de uma vez, vai só o aviso mais grave.
        </p>
        <p className="t-sub mt-3 text-label-2">
          Destino: <span className="font-semibold text-label">{overview.email}</span>
          {!overview.emailConfigured && " · o envio de e-mail ainda não foi configurado."}
        </p>
      </section>

      <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Faixas de {overview.year}</h2>
      <ul className="divide-y divide-sep rounded-card bg-card">
        {bands.map((b) => {
          const row = stored.get(b.kind);
          const crossed = due.has(b.kind);
          const status = !crossed
            ? { Icon: Circle, label: "Ainda não cruzada", cls: "text-label-2" }
            : row?.sentAt
              ? { Icon: CheckCircle, label: `Cruzada · e-mail enviado em ${formatFullShortDate(row.sentAt.slice(0, 10))}`, cls: "text-ok-text" }
              : { Icon: Clock, label: overview.emailConfigured ? "Cruzada · e-mail na fila" : "Cruzada · e-mail aguardando configuração", cls: "text-warn-text" };
          return (
            <li key={b.kind} className="flex gap-3.5 px-5 py-3.5">
              <status.Icon size={24} weight={crossed ? "fill" : "regular"} className={`mt-0.5 shrink-0 ${status.cls}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="t-row">{b.title}</p>
                <p className="t-sub text-label-2">{b.text}</p>
                <p className={`t-sub mt-1 font-semibold ${status.cls}`}>{status.label}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="t-sub mt-3 px-5 text-label-2">O lembrete do vencimento do DAS ainda não foi criado. Por enquanto, a data do próximo DAS aparece no Painel.</p>
    </>
  );
}
