import { rulesFor, type Dashboard } from "@/core";
import { opensInYear, retroactiveSince, type Tone } from "./copy";
import { formatPercent, formatReais, monthName } from "./format";

/**
 * O conteúdo da tela "Regras do ano", escrito para quem nunca ouviu falar em desenquadramento: cada faixa diz o
 * que acontece na prática, a conta do limite aparece inteira e a palavra técnica, quando aparece, vem explicada.
 * Só descreve regras de docs/mei-rules.md; nenhuma conta nova acontece aqui.
 */

export interface LadderStep {
  /** "Até R$ 67.500", "De R$ 67.500 a R$ 81.000", "Acima de R$ 81.000". */
  range: string;
  title: string;
  tone: Tone;
  points: string[];
  /** O faturamento confirmado de hoje está nesta faixa. */
  current: boolean;
}

export interface WarningStep {
  when: string;
  value: string;
  text: string;
}

export interface RulesGuide {
  year: number;
  /** "R$ 6.750 por mês de atividade × 10 meses. Sua empresa abriu em março." */
  limitMath: string;
  ladder: LadderStep[];
  warnings: WarningStep[];
  dasDueDay: number;
}

export function rulesGuide(d: Dashboard, openingDate: string | null): RulesGuide {
  const { year, limitCents, toleranceLimitCents, accumulatedCents } = d;
  const cfg = rulesFor(year);
  const monthly = formatReais(Math.trunc(cfg.annualLimitCents / 12));
  const months = opensInYear(year, openingDate) ? 12 - Number(openingDate.slice(5, 7)) + 1 : 12;
  const limitMath =
    months < 12
      ? `${monthly} por mês de atividade × ${months} meses. Sua empresa abriu em ${monthName(Number(openingDate!.slice(5, 7)) - 1)} de ${year}, então o limite deste ano é proporcional.`
      : `${monthly} por mês × 12 meses.`;

  const limit = formatReais(limitCents);
  const tolerance = formatReais(toleranceLimitCents);
  const ladder: LadderStep[] = [
    {
      range: `Até ${limit}`,
      title: "Tudo certo",
      tone: "ok",
      points: ["Você segue MEI normalmente, pagando só a guia fixa de cada mês (o DAS)."],
      current: accumulatedCents <= limitCents,
    },
    {
      range: `De ${limit} a ${tolerance}`,
      title: `Passou, mas até ${formatPercent(cfg.toleranceRate)} acima`,
      tone: "alert",
      points: [
        `Você termina ${year} como MEI.`,
        "Paga imposto a mais sobre o que passou do limite, numa guia extra.",
        "Precisa avisar a Receita até o último dia útil do mês seguinte ao que passou.",
        `Vira microempresa (ME) em 1º de janeiro de ${year + 1}, e os impostos deixam de ser fixos: passam a ser uma parte de tudo que você fatura.`,
      ],
      current: accumulatedCents > limitCents && accumulatedCents <= toleranceLimitCents,
    },
    {
      range: `Acima de ${tolerance}`,
      title: `Passou de ${formatPercent(cfg.toleranceRate)} acima`,
      tone: "danger",
      points: [
        `Você deixa de ser MEI ${retroactiveSince(year, openingDate)}: a mudança vale para trás.`,
        "Paga a diferença de imposto de todos esses meses, com juros e multa.",
        "Também precisa avisar a Receita.",
      ],
      current: accumulatedCents > toleranceLimitCents,
    },
  ];

  const warnings: WarningStep[] = [
    { when: `Aos ${formatPercent(cfg.warningRatio)}`, value: formatReais(Math.trunc(limitCents * cfg.warningRatio)), text: "Aviso de atenção: ainda dá tempo de planejar." },
    { when: `Aos ${formatPercent(cfg.criticalRatio)}`, value: formatReais(Math.trunc(limitCents * cfg.criticalRatio)), text: "Aviso crítico: simule cada venda antes de aceitar." },
    { when: "Ao passar", value: limit, text: "Aviso de que passou, com o que fazer." },
  ];

  return { year, limitMath, ladder, warnings, dasDueDay: cfg.dasDueDay };
}
