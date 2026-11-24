import type { Dashboard, RiskBand } from "@/core";
import { formatDayMonth, formatReais } from "./format";

export type Tone = "ok" | "warn" | "danger";

export interface BandView {
  label: string;
  tone: Tone;
}

/** Como cada faixa de risco aparece: sempre com texto, e a cor só reforça. */
export function bandView(band: RiskBand): BandView {
  switch (band) {
    case "ok":
      return { label: "Dentro do limite", tone: "ok" };
    case "attention":
      return { label: "Atenção", tone: "warn" };
    case "critical":
      return { label: "Crítico", tone: "danger" };
    case "over_tolerance":
      return { label: "Acima do limite", tone: "danger" };
    case "over_retroactive":
      return { label: "Acima de 20%", tone: "danger" };
  }
}

export interface ForecastView {
  headline: string;
  body: string;
}

/**
 * Frase da previsão. Só escreve em português o que o núcleo já calculou:
 * nenhuma conta nova acontece aqui.
 */
export function forecastView(d: Dashboard): ForecastView {
  const { year, accumulatedCents, limitCents, toleranceLimitCents, projection } = d;

  if (accumulatedCents === 0) {
    return {
      headline: `Ainda não há receita confirmada em ${year}.`,
      body: "Envie uma nota e confirme os dados. A previsão aparece assim que houver faturamento.",
    };
  }

  if (projection.limitCrossing.status === "reached") {
    const excess = accumulatedCents - limitCents;
    const body =
      d.band === "over_retroactive"
        ? "O excesso passa de 20%: o desenquadramento vale desde janeiro."
        : `Até 20% acima você segue MEI neste ano, mas é desenquadrado em 1º de janeiro de ${year + 1}.`;
    return {
      headline: `Você já passou do limite de ${year}.`,
      body: `O excesso é de ${formatReais(excess)}. ${body}`,
    };
  }

  if (projection.limitCrossing.status === "projected") {
    const end = projection.projectedYearEndCents;
    const tail =
      end <= toleranceLimitCents
        ? "Até 20% acima você segue MEI neste ano."
        : "Mais de 20% acima, o desenquadramento é retroativo.";
    return {
      headline: `Você deve passar do limite em ${formatDayMonth(projection.limitCrossing.date)}.`,
      body: `No ritmo atual, ${year} fecha em ${formatReais(end)}. ${tail}`,
    };
  }

  const room = limitCents - projection.projectedYearEndCents;
  return {
    headline: `No ritmo atual, você termina ${year} dentro do limite.`,
    body: `A previsão é fechar em ${formatReais(projection.projectedYearEndCents)}, ${formatReais(Math.max(0, room))} abaixo do limite.`,
  };
}

/** "em 26 dias", "amanhã", "hoje". */
export function daysUntilLabel(days: number): string {
  if (days <= 0) return "vence hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

export function pendingLabel(count: number): string {
  return count === 0 ? "tudo conferido" : "para você conferir";
}
