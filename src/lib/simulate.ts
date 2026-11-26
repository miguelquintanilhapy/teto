import { rulesFor, simulateExtraRevenue, toleranceLimitFor, type Cents, type ScenarioResult } from "@/core";
import { bandView, type BandView } from "./copy";
import { formatReais } from "./format";

export interface SimulateContext {
  year: number;
  limitCents: Cents;
  accumulatedCents: Cents;
}

export interface SimulationView {
  result: ScenarioResult;
  band: BandView;
  ratio: number;
  addedRatio: number;
  headline: string;
  detail: string;
  /** As duas referências, sempre à vista: "Limite R$ 67.500 · com 20%: R$ 81.000". */
  references: string;
  /** Só existe quando a venda acrescenta custo. Sempre dito como estimativa. */
  costLine: string | null;
  /**
   * A resposta da simulação, em destaque: quanto ainda cabe até o limite ou quanto passa dele.
   * É o número que a pessoa procura; o resto do cartão só explica.
   */
  answer: { label: string; cents: Cents };
  /** Uma frase só, com a consequência. */
  note: string;
}

/**
 * "E se eu aceitar uma venda de R$ X?" Os números vêm do núcleo (`simulateExtraRevenue`);
 * aqui só se escreve o resultado em português.
 */
export function simulationView(ctx: SimulateContext, extraCents: Cents): SimulationView {
  const cfg = rulesFor(ctx.year);
  const result = simulateExtraRevenue(ctx.accumulatedCents, extraCents, ctx.limitCents, cfg);
  const { after } = result;
  const toleranceCents = toleranceLimitFor(ctx.limitCents, cfg.toleranceRate);
  const atLimit = extraCents > 0 && after.accumulatedCents === ctx.limitCents;
  // Chegar exatamente ao limite não é passar dele: texto próprio, em vez de só "Crítico".
  const band: BandView = atLimit ? { label: "Limite atingido", tone: "alert" } : bandView(after.band);
  const ratio = ctx.limitCents > 0 ? after.accumulatedCents / ctx.limitCents : 0;
  const addedRatio = ctx.limitCents > 0 ? extraCents / ctx.limitCents : 0;
  const over = Math.max(0, after.accumulatedCents - ctx.limitCents);
  const left = Math.max(0, ctx.limitCents - after.accumulatedCents);

  let headline: string;
  let detail: string;
  if (atLimit) {
    headline = "Esta venda usa todo o limite.";
    detail = `Qualquer venda a mais passa do limite. Até ${formatReais(toleranceCents)} você ainda segue MEI neste ano.`;
  } else
  switch (after.band) {
    case "ok":
      headline = extraCents === 0 ? "Digite o valor da venda." : "Cabe no limite.";
      detail = `Depois dela, ainda sobram ${formatReais(left)} no ano.`;
      break;
    case "attention":
    case "critical":
      headline = result.changesBand ? `Esta venda leva você para ${band.label.toLowerCase()}.` : `Você continua em ${band.label.toLowerCase()}.`;
      detail = `Depois dela, sobram ${formatReais(left)} até o limite e ${formatReais(Math.max(0, toleranceCents - after.accumulatedCents))} até o limite com tolerância.`;
      break;
    case "over_tolerance":
      headline = `Esta venda passa do limite em ${formatReais(over)}.`;
      detail = `Até 20% acima você segue MEI neste ano, mas é desenquadrado em 1º de janeiro de ${ctx.year + 1}.`;
      break;
    case "over_retroactive":
      headline = "Esta venda passa de 20% acima do limite.";
      detail = `O desenquadramento vale desde janeiro de ${ctx.year}, e os impostos do ano são recalculados.`;
      break;
  }

  const costLine =
    result.additionalCostCents > 0
      ? `Custo extra estimado: ${formatReais(result.additionalCostCents)}. É uma estimativa, não um valor oficial.`
      : null;

  const references = `Limite ${formatReais(ctx.limitCents)} · com 20% a mais: ${formatReais(toleranceCents)}`;

  let answer: SimulationView["answer"];
  let note: string;
  if (extraCents === 0) {
    answer = { label: "Hoje ainda cabem", cents: left };
    note = "Digite um valor ou toque num atalho para ver o efeito de uma venda.";
  } else if (atLimit) {
    answer = { label: "Depois desta venda, ainda cabem", cents: 0 };
    note = `Qualquer venda a mais passa do limite. Até ${formatReais(toleranceCents)} você ainda segue MEI neste ano.`;
  } else if (after.band === "over_tolerance") {
    answer = { label: "Esta venda passa do limite em", cents: over };
    note = `Até ${formatReais(toleranceCents)} você segue MEI neste ano, mas é desenquadrado em 1º de janeiro de ${ctx.year + 1}.`;
  } else if (after.band === "over_retroactive") {
    answer = { label: "Esta venda passa do limite em", cents: over };
    note = `Passa de ${formatReais(toleranceCents)}: o desenquadramento vale desde janeiro de ${ctx.year}, e os impostos do ano são recalculados.`;
  } else {
    answer = { label: "Depois desta venda, ainda cabem", cents: left };
    note =
      after.band === "ok"
        ? "Cabe com folga no limite do ano."
        : result.changesBand
          ? `Esta venda leva você para ${band.label.toLowerCase()}.`
          : `Você continua em ${band.label.toLowerCase()}.`;
  }
  return { result, band, ratio, addedRatio, headline: headline!, detail: detail!, references, costLine, answer, note };
}
