import type { AlertKind } from "@/core";
import { retroactiveConsequence, toleranceConsequence } from "@/lib/copy";
import { formatDayMonth, formatPercent, formatReais } from "@/lib/format";

export interface AlertContext {
  profileName: string;
  year: number;
  accumulatedCents: number;
  limitCents: number;
  toleranceLimitCents: number;
  /** No ano de abertura, a saída retroativa vale desde a abertura, e não desde janeiro. */
  openingDate: string | null;
  /** Quando o limite será ultrapassado, se a projeção disser. */
  projectedCrossing: string | null;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Do mais leve ao mais grave: ao juntar vários alertas pendentes, só o mais grave vira e-mail. */
export const ALERT_SEVERITY: ReadonlyArray<AlertKind> = ["threshold_warning", "threshold_critical", "over_limit", "over_tolerance"];

export const mostSevere = (kinds: ReadonlyArray<AlertKind>): AlertKind | null =>
  [...kinds].sort((a, b) => ALERT_SEVERITY.indexOf(b) - ALERT_SEVERITY.indexOf(a))[0] ?? null;

function copy(kind: AlertKind, c: AlertContext): { subject: string; headline: string; body: string[] } {
  const used = formatPercent(c.limitCents > 0 ? c.accumulatedCents / c.limitCents : 0);
  const faltam = formatReais(Math.max(0, c.limitCents - c.accumulatedCents));
  const excess = formatReais(Math.max(0, c.accumulatedCents - c.limitCents));
  const crossing = c.projectedCrossing ? [`No ritmo atual, o limite será ultrapassado em ${formatDayMonth(c.projectedCrossing)}.`] : [];
  switch (kind) {
    case "threshold_warning":
      return {
        subject: `Teto: você já usou ${used} do limite do MEI`,
        headline: `Você usou ${used} do limite de ${c.year}`,
        body: [`Faturamento confirmado: ${formatReais(c.accumulatedCents)} de ${formatReais(c.limitCents)}. Ainda cabem ${faltam}.`, ...crossing],
      };
    case "threshold_critical":
      return {
        subject: `Teto: atenção, ${used} do limite do MEI`,
        headline: `Atenção: ${used} do limite de ${c.year}`,
        body: [`Restam só ${faltam}. Antes de aceitar uma venda grande, simule o efeito no app.`, ...crossing],
      };
    case "over_limit":
      return {
        subject: "Teto: você passou do limite do MEI",
        headline: `Você passou do limite de ${c.year} em ${excess}`,
        body: [
          toleranceConsequence(c.year, c.toleranceLimitCents),
          "Fale com um contador: você precisa avisar a Receita até o último dia útil do mês seguinte.",
        ],
      };
    case "over_tolerance":
      return {
        subject: "Teto: você passou de 20% acima do limite do MEI",
        headline: "Você passou de 20% acima do limite",
        body: [
          `O faturamento confirmado chegou a ${formatReais(c.accumulatedCents)}.`,
          retroactiveConsequence(c.year, c.openingDate, c.toleranceLimitCents),
          "Procure um contador o quanto antes.",
        ],
      };
  }
}

/** Monta o e-mail de um alerta, em texto e HTML (com o conteúdo escapado). */
export function buildAlertEmail(kind: AlertKind, c: AlertContext): { subject: string; text: string; html: string } {
  const { subject, headline, body } = copy(kind, c);
  const footer = "Estimativas feitas pelo Teto. Confirme sempre no Portal do Empreendedor.";
  const text = [`${c.profileName}`, "", headline, "", ...body, "", footer].join("\n");
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#111">
<p style="color:#6c6c70;margin:0 0 8px">${escapeHtml(c.profileName)}</p>
<h1 style="font-size:22px;line-height:1.25;margin:0 0 16px">${escapeHtml(headline)}</h1>
${body.map((p) => `<p style="font-size:16px;line-height:1.5;margin:0 0 12px">${escapeHtml(p)}</p>`).join("\n")}
<p style="font-size:13px;color:#6c6c70;margin:24px 0 0">${escapeHtml(footer)}</p>
</div>`;
  return { subject, text, html };
}
