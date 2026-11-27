import { Suspense } from "react";
import { CheckCircle, DownloadSimple, Warning, WarningOctagon } from "@phosphor-icons/react/dist/ssr";
import { yearOf } from "@/core";
import { formatFullShortDate } from "@/lib/format";
import { PrintButton } from "@/components/report/print-button";
import { SheetShell } from "@/components/send/sheet-shell";
import { formatMoney, formatPercent, formatReais, monthName } from "@/lib/format";
import { bandView, type Tone } from "@/lib/copy";
import { buildYearReport } from "@/lib/report";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Relatório · Teto" };

const TONE_TEXT: Record<Tone, string> = { ok: "text-ok-text", warn: "text-warn-text", alert: "text-alert-text", danger: "text-danger-text" };
const TONE_ICON: Record<Tone, typeof CheckCircle> = { ok: CheckCircle, warn: Warning, alert: Warning, danger: WarningOctagon };

/** "Com nota R$ X" e "Sem nota R$ Y", uma por linha, ou "Tudo com nota" / "Tudo sem nota" quando só há um dos dois. */
function noteSplit(withNote: number, withoutNote: number): string[] {
  if (withoutNote === 0) return ["Tudo com nota"];
  if (withNote === 0) return ["Tudo sem nota"];
  return [`Com nota ${formatMoney(withNote)}`, `Sem nota ${formatMoney(withoutNote)}`];
}

function NoteSplit({ withNote, withoutNote }: { withNote: number; withoutNote: number }) {
  return (
    <span className="sensitive t-caption mt-0.5 block text-label-2">
      {noteSplit(withNote, withoutNote).map((line) => (
        <span key={line} className="block whitespace-nowrap">
          {line}
        </span>
      ))}
    </span>
  );
}

export default function RelatorioPage() {
  return (
    <SheetShell title="Relatório do ano" closeHref="/perfil">
      <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Conteudo />
      </Suspense>
    </SheetShell>
  );
}

async function Conteudo() {
  const r = await loadPanelSafe("relatorio");
  if (!r.ok) {
    return (
      <p role="alert" className="t-body rounded-card bg-card p-5">
        {r.reason === "no_profile" ? "Cadastre o MEI para ver o relatório." : "Não foi possível carregar o relatório. Tente de novo em instantes."}
      </p>
    );
  }
  const { panel } = r;
  const year = yearOf(panel.today);
  const report = buildYearReport(panel.transactions, year);
  const { limitCents, accumulatedCents } = panel.dashboard;
  const band = bandView(panel.dashboard.band);
  const BandIcon = TONE_ICON[band.tone];
  const left = limitCents - accumulatedCents;
  const rows = report.months.filter((m) => m.revenueCount > 0 || m.expenseCents > 0);

  return (
    <article className="print:text-black">
      <header className="mb-4 px-1">
        <h2 className="t-title">{panel.profile.name}</h2>
        <p className="t-sub text-label-2">
          Receitas de {year} · gerado em {formatFullShortDate(panel.today)}
        </p>
      </header>

      <section className="rounded-card bg-card p-5" aria-label="Total do ano">
        <p className="t-sub text-label-2">Receita bruta confirmada</p>
        <p className="t-display sensitive mt-1">{formatMoney(report.revenueCents)}</p>
        <p className="t-body mt-2 text-label-2">
          {formatPercent(limitCents > 0 ? report.revenueCents / limitCents : 0)} do limite de {formatReais(limitCents)}
        </p>
        {/* O estado, como no Painel: com ícone e texto, e a cor só reforça. */}
        <p className={`t-sub mt-1 flex items-center gap-1.5 font-semibold ${TONE_TEXT[band.tone]}`}>
          <BandIcon size={16} weight="fill" aria-hidden="true" className="shrink-0" />
          {band.label} ·{" "}
          <span className="sensitive">{left >= 0 ? `ainda cabem ${formatReais(left)}` : `passou ${formatReais(-left)}`}</span>
        </p>
      </section>

      <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Mês a mês</h2>
      {rows.length === 0 ? (
        <p className="t-body rounded-card bg-card p-5 text-label-2">Ainda não há receita confirmada neste ano.</p>
      ) : (
        <div className="overflow-hidden rounded-card bg-card">
        <table className="w-full text-left">
          <caption className="sr-only">Receita confirmada por mês</caption>
          <thead>
            <tr className="t-sub text-label-2">
              <th scope="col" className="px-5 pt-4 pb-2 font-semibold">Mês</th>
              <th scope="col" className="px-5 pt-4 pb-2 text-right font-semibold">Receita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sep">
            {rows.map((m) => (
              <tr key={m.month} className="break-inside-avoid">
                <th scope="row" className="px-5 py-3 font-normal">
                  <span className="block text-[1.0625rem] font-medium capitalize">{monthName(m.month)}</span>
                  {/* A divisão do relatório mensal oficial: com documento fiscal e sem. */}
                  <NoteSplit withNote={m.withNoteCents} withoutNote={m.withoutNoteCents} />
                </th>
                <td className="sensitive px-5 py-3 text-right align-top text-[1.0625rem] font-semibold whitespace-nowrap">{formatMoney(m.revenueCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-sep">
              <th scope="row" className="px-5 py-3.5 font-normal">
                <span className="block text-[1.0625rem] font-bold">Total</span>
                <NoteSplit withNote={report.withNoteCents} withoutNote={report.withoutNoteCents} />
              </th>
              <td className="sensitive px-5 py-3.5 text-right align-top text-[1.0625rem] font-bold whitespace-nowrap">{formatMoney(report.revenueCents)}</td>
            </tr>
          </tfoot>
        </table>
        </div>
      )}

      {(report.cancelledCount > 0 || report.pendingCount > 0 || report.expenseCents > 0) && (
        <dl className="t-sub mt-3 flex flex-col gap-1 px-5 text-label-2">
          {report.expenseCents > 0 && (
            <div className="flex justify-between gap-3">
              <dt>Despesas (não contam no limite)</dt>
              <dd className="sensitive font-semibold whitespace-nowrap text-label">{formatMoney(report.expenseCents)}</dd>
            </div>
          )}
          {report.cancelledCount > 0 && (
            <div className="flex justify-between gap-3">
              <dt>Cancelados (fora da soma)</dt>
              <dd className="font-semibold text-label">{report.cancelledCount}</dd>
            </div>
          )}
          {report.pendingCount > 0 && (
            <div className="flex justify-between gap-3">
              <dt>Para conferir (fora da soma)</dt>
              <dd className="font-semibold text-label">{report.pendingCount}</dd>
            </div>
          )}
        </dl>
      )}

      <p className="t-sub mt-4 px-5 text-label-2">
        Resumo de apoio. O Relatório Mensal de Receitas Brutas oficial, que o MEI preenche e guarda (não entrega), separa
        a receita com e sem nota, como aqui, e também por atividade (comércio, indústria e serviços), o que o Teto não sabe.
      </p>

      <div className="no-print mt-6 flex flex-col gap-3">
        <a
          href="/api/report"
          download
          className="flex h-[3.375rem] w-full items-center justify-center gap-2 rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary"
        >
          <DownloadSimple size={22} weight="bold" aria-hidden="true" />
          Baixar lançamentos em CSV
        </a>
        <PrintButton />
      </div>
    </article>
  );
}
