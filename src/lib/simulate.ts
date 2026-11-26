import { rulesFor, simulateExtraRevenue, toleranceLimitFor, type Cents, type ScenarioResult } from "@/core";
import { bandView, retroactiveConsequence, toleranceConsequence, type BandView } from "./copy";
import { formatReais } from "./format";

export interface SimulateContext {
  year: number;
  limitCents: Cents;
  accumulatedCents: Cents;
  /** Data de abertura do MEI: no ano de abertura, a saída retroativa vale desde a abertura, e não desde janeiro. */
  openingDate: string | null;
}

export interface SimulationView {
  result: ScenarioResult;
  band: BandView;
  ratio: number;
  addedRatio: number;
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

  const costLine =
    result.additionalCostCents > 0
      ? `Custo extra estimado: ${formatReais(result.additionalCostCents)}. É uma estimativa, não um valor oficial.`
      : null;

  let answer: SimulationView["answer"];
  let note: string;
  if (extraCents === 0) {
    answer = { label: "Hoje ainda cabem", cents: left };
    note = "Digite um valor ou toque num atalho para ver o efeito de uma venda.";
  } else if (atLimit) {
    answer = { label: "Depois desta venda, ainda cabem", cents: 0 };
    note = `Qualquer venda a mais passa do limite. Até ${formatReais(toleranceCents)} você ainda termina o ano como MEI.`;
  } else if (after.band === "over_tolerance") {
    answer = { label: "Esta venda passa do limite em", cents: over };
    note = toleranceConsequence(ctx.year, toleranceCents);
  } else if (after.band === "over_retroactive") {
    answer = { label: "Esta venda passa do limite em", cents: over };
    note = retroactiveConsequence(ctx.year, ctx.openingDate, toleranceCents);
  } else {
    answer = { label: "Depois desta venda, ainda cabem", cents: left };
    note =
      after.band === "ok"
        ? "Cabe com folga no limite do ano."
        : result.changesBand
          ? `Esta venda leva você para ${band.label.toLowerCase()}.`
          : `Você continua em ${band.label.toLowerCase()}.`;
  }
  return { result, band, ratio, addedRatio, costLine, answer, note };
}
