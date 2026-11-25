import type { Dashboard, RiskBand } from "@/core";
import { formatDayMonth, formatReais, monthName } from "./format";

/** ok < warn < alert < danger: verde, âmbar, laranja-avermelhado (crítico) e vermelho (passou do limite). */
export type Tone = "ok" | "warn" | "alert" | "danger";

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
      return { label: "Crítico", tone: "alert" };
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
  return count === 0 ? "nenhuma pendente" : "para você conferir";
}

/** Leitura do cartão de notas para o leitor de tela: sem "zero notas: tudo conferido". */
export function pendingAria(count: number): string {
  if (count === 0) return "Nenhuma nota para conferir";
  return `${count} ${count === 1 ? "nota" : "notas"} para conferir`;
}

/** O que o usuário pode fazer agora, por faixa. A faixa "ok" não pede nada. */
export function bandAdvice(band: RiskBand): string | null {
  switch (band) {
    case "ok":
      return null;
    case "attention":
      return "Antes de aceitar uma venda grande, simule o efeito no limite.";
    case "critical":
      return "Simule cada venda nova antes de aceitar. Se precisar passar do limite, fale com seu contador.";
    case "over_tolerance":
    case "over_retroactive":
      return "Fale com seu contador sobre o desenquadramento.";
  }
}

/** Competência do DAS: o que vence no dia 20 é referente ao mês anterior. */
export function dasCompetence(dueDate: string): string {
  const month = Number(dueDate.slice(5, 7)); // 1 a 12
  return monthName(month === 1 ? 11 : month - 2);
}

/**
 * A premissa da previsão, dita com todas as letras: média por mês desde quando.
 * Só descreve o que `projectYear` já usa (receita ÷ dias desde o início da contagem).
 */
export function paceLine(d: Dashboard, openingDate: string | null): string | null {
  if (d.accumulatedCents === 0) return null;
  const monthly = Math.round(d.projection.dailyRateCents * 30.4375);
  const opensThisYear = openingDate !== null && Number(openingDate.slice(0, 4)) === d.year && openingDate.slice(5) > "01-01";
  const since = opensThisYear ? `a abertura, em ${monthName(Number(openingDate!.slice(5, 7)) - 1)}` : "janeiro";
  return `Média de ${formatReais(monthly)} por mês desde ${since}. A previsão muda a cada nova receita.`;
}

export interface LimitExplainerRow {
  title: string;
  value: string;
  text: string;
}

/** As três faixas do limite, em linguagem simples, para o Painel explicar sem mandar o usuário ao Perfil. */
export function limitExplainer(d: Dashboard, openingDate: string | null): LimitExplainerRow[] {
  const opensThisYear = openingDate !== null && Number(openingDate.slice(0, 4)) === d.year;
  const months = opensThisYear ? 12 - Number(openingDate!.slice(5, 7)) + 1 : 12;
  return [
    {
      title: "Limite do ano",
      value: formatReais(d.limitCents),
      text: months < 12 ? `Proporcional: sua empresa abriu em ${monthName(Number(openingDate!.slice(5, 7)) - 1)}, são ${months} meses de atividade em ${d.year}.` : `O limite anual completo de ${d.year}.`,
    },
    {
      title: "Até 20% acima",
      value: formatReais(d.toleranceLimitCents),
      text: `Se passar do limite mas ficar até aqui, você segue MEI neste ano e é desenquadrado em 1º de janeiro de ${d.year + 1}.`,
    },
    {
      title: "Acima disso",
      value: `mais de ${formatReais(d.toleranceLimitCents)}`,
      text: `O desenquadramento vale desde ${opensThisYear ? "a abertura" : `janeiro de ${d.year}`}, e os impostos do ano são recalculados.`,
    },
  ];
}
