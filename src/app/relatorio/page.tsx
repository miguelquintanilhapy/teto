import { Suspense } from "react";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { yearOf } from "@/core";
import { formatFullShortDate } from "@/lib/format";
import { PrintButton } from "@/components/report/print-button";
import { SheetShell } from "@/components/send/sheet-shell";
import { formatMoney, formatPercent, formatReais, monthName } from "@/lib/format";
import { buildYearReport } from "@/lib/report";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Relatório · Teto" };

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
  const { limitCents } = panel.dashboard;
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
              <th scope="col" className="px-2 pt-4 pb-2 text-right font-semibold">Lançamentos</th>
              <th scope="col" className="px-5 pt-4 pb-2 text-right font-semibold">Receita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sep">
            {rows.map((m) => (
              <tr key={m.month}>
                <th scope="row" className="px-5 py-3 text-[1.0625rem] font-medium capitalize">{monthName(m.month)}</th>
                <td className="px-2 py-3 text-right text-[1.0625rem] text-label-2">{m.revenueCount}</td>
                <td className="sensitive px-5 py-3 text-right text-[1.0625rem] font-semibold">{formatMoney(m.revenueCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-sep">
              <th scope="row" className="px-5 py-3.5 text-[1.0625rem] font-bold">Total</th>
              <td className="px-2 py-3.5" />
              <td className="sensitive px-5 py-3.5 text-right text-[1.0625rem] font-bold">{formatMoney(report.revenueCents)}</td>
            </tr>
          </tfoot>
        </table>
        </div>
      )}

      {(report.cancelledCount > 0 || report.pendingCount > 0 || report.expenseCents > 0) && (
        <p className="t-sub mt-3 px-5 text-label-2">
          {report.expenseCents > 0 && `Despesas confirmadas: ${formatMoney(report.expenseCents)} (não contam no limite). `}
          {report.cancelledCount > 0 && `${report.cancelledCount} ${report.cancelledCount === 1 ? "lançamento cancelado fica" : "lançamentos cancelados ficam"} fora da soma. `}
          {report.pendingCount > 0 && `${report.pendingCount} para conferir, também fora da soma.`}
        </p>
      )}

      <p className="t-sub mt-4 px-5 text-label-2">
        Resumo de apoio. Não substitui o Relatório Mensal de Receitas Brutas oficial, que o MEI mantém e não entrega.
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
