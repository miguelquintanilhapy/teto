import Image from "next/image";
import { formatCnpjInput, formatMoney, formatPercent, formatReais, monthName } from "@/lib/format";
import { historyMonths } from "@/lib/history";
import type { YearReport } from "@/lib/report";

/** 2026-03-01 vira 01/03/2026: o formato de documento. */
const dateBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const cap = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/**
 * O relatório como documento, só na impressão (e no PDF): folha A4 de largura inteira, cabeçalho com nome, CNPJ e
 * período, uma tabela com um mês por linha (com nota, sem nota e total) e o rodapé em letra pequena. Na tela, quem
 * aparece é o relatório do app; aqui, o papel que o MEI guarda ou manda ao contador.
 */
export function PrintReport({
  name,
  taxId,
  openingDate,
  today,
  report,
  limitCents,
  bandLabel,
}: {
  name: string;
  taxId: string;
  openingDate: string;
  today: string;
  report: YearReport;
  limitCents: number;
  bandLabel: string;
}) {
  const months = historyMonths(today, openingDate).map((m) => report.months[Number(m.slice(5, 7)) - 1]!);
  const left = limitCents - report.revenueCents;
  const first = months[0];
  const last = months[months.length - 1];

  return (
    <section aria-hidden="true" className="print-report hidden text-[10.5pt] leading-snug text-black print:block">
      <header className="flex items-end justify-between gap-6 border-b-2 border-black pb-3">
        <div>
          <p className="text-[8.5pt] font-semibold tracking-[0.12em] uppercase">Relatório de receitas brutas</p>
          <h1 className="mt-1 text-[18pt] leading-tight font-bold">{name}</h1>
          <p className="mt-1">
            CNPJ {formatCnpjInput(taxId)} · aberto em {dateBr(openingDate)}
          </p>
        </div>
        <div className="flex flex-col items-end text-right">
          {/* A marca do Teto, como num papel timbrado: preta, para sair bem em qualquer impressora. */}
          <Image src="/brand/teto-logo-preta.png" alt="Teto" width={442} height={242} className="mb-2 h-[13mm] w-auto" />
          <p className="text-[18pt] leading-tight font-bold">{report.year}</p>
          <p className="mt-1 text-[9pt]">
            {first && last ? `${cap(monthName(first.month))} a ${monthName(last.month)}` : ""} · gerado em {dateBr(today)}
          </p>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-4 gap-4 border-b border-black/30 pb-4">
        <div>
          <dt className="text-[8.5pt]">Receita bruta</dt>
          <dd className="text-[13pt] font-bold tabular-nums">{formatMoney(report.revenueCents)}</dd>
        </div>
        <div>
          <dt className="text-[8.5pt]">Limite do ano</dt>
          <dd className="text-[13pt] font-bold tabular-nums">{formatReais(limitCents)}</dd>
        </div>
        <div>
          <dt className="text-[8.5pt]">Usado</dt>
          <dd className="text-[13pt] font-bold tabular-nums">{formatPercent(limitCents > 0 ? report.revenueCents / limitCents : 0)}</dd>
        </div>
        <div>
          <dt className="text-[8.5pt]">Situação</dt>
          <dd className="text-[13pt] font-bold">{bandLabel}</dd>
          <dd className="text-[8.5pt] tabular-nums">{left >= 0 ? `ainda cabem ${formatReais(left)}` : `passou ${formatReais(-left)}`}</dd>
        </div>
      </dl>

      <table className="mt-4 w-full border-collapse tabular-nums">
        <thead>
          <tr className="border-b border-black text-left text-[9pt]">
            <th scope="col" className="py-1.5 pr-2 font-semibold">Mês</th>
            <th scope="col" className="py-1.5 px-2 text-right font-semibold">Com nota</th>
            <th scope="col" className="py-1.5 px-2 text-right font-semibold">Sem nota</th>
            <th scope="col" className="py-1.5 pl-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month} className="border-b border-black/15">
              <th scope="row" className="py-1.5 pr-2 text-left font-normal">{cap(monthName(m.month))}</th>
              <td className="py-1.5 px-2 text-right">{formatMoney(m.withNoteCents)}</td>
              <td className="py-1.5 px-2 text-right">{formatMoney(m.withoutNoteCents)}</td>
              <td className="py-1.5 pl-2 text-right font-semibold">{formatMoney(m.revenueCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black">
            <th scope="row" className="py-2 pr-2 text-left font-bold">Total</th>
            <td className="py-2 px-2 text-right font-bold">{formatMoney(report.withNoteCents)}</td>
            <td className="py-2 px-2 text-right font-bold">{formatMoney(report.withoutNoteCents)}</td>
            <td className="py-2 pl-2 text-right font-bold">{formatMoney(report.revenueCents)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-4 text-[8.5pt] leading-normal">
        <p>
          Só entra receita confirmada. Despesas confirmadas no ano: {formatMoney(report.expenseCents)} (não contam no limite).
          {report.cancelledCount > 0 && ` Lançamentos cancelados: ${report.cancelledCount} (fora da soma).`}
          {report.pendingCount > 0 && ` Para conferir: ${report.pendingCount} (fora da soma).`}
        </p>
        <p className="mt-2">
          &ldquo;Com nota&rdquo; é a receita lançada a partir de uma nota fiscal; &ldquo;sem nota&rdquo;, a lançada à mão ou por Pix sem nota.
          Resumo de apoio, gerado pelo Teto. O Relatório Mensal de Receitas Brutas oficial, que o MEI preenche e guarda,
          também separa a receita por atividade (comércio, indústria e serviços). Confirme os valores com seu contador.
        </p>
      </div>
    </section>
  );
}
