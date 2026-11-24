/**
 * Valores em CENTAVOS (inteiros). Nunca usamos float para dinheiro.
 *
 * ATENÇÃO: os parâmetros abaixo refletem as regras do MEI conforme entendidas
 * pela equipe. Confirme no Portal do Empreendedor antes de usar em produção.
 * Ver docs/mei-rules.md.
 */
export type Cents = number;

export interface MeiConfig {
  /** Limite anual de receita bruta. */
  annualLimitCents: Cents;
  /** Tolerância acima do limite (0.2 = 20%). */
  toleranceRate: number;
  /** Fração do limite que dispara o alerta de atenção. */
  warningRatio: number;
  /** Fração do limite que dispara o alerta crítico. */
  criticalRatio: number;
  /**
   * ESTIMATIVA: alíquota aplicada sobre o excedente quando o estouro fica
   * dentro da tolerância. Placeholder configurável, não é valor oficial.
   */
  excessTaxRate: number;
  /**
   * ESTIMATIVA: alíquota efetiva sobre toda a receita do ano quando o
   * desenquadramento é retroativo. Placeholder configurável.
   */
  retroactiveTaxRate: number;
  /** Dia de vencimento do DAS. */
  dasDueDay: number;
}

export const DEFAULT_MEI_CONFIG: Readonly<MeiConfig> = Object.freeze({
  annualLimitCents: 81_000_00,
  toleranceRate: 0.2,
  warningRatio: 0.8,
  criticalRatio: 0.9,
  excessTaxRate: 0.06,
  retroactiveTaxRate: 0.06,
  dasDueDay: 20,
});

/**
 * Diferenças por ano em relação ao padrão. A lei muda; o código não.
 * Para alterar o limite de um ano, basta adicionar uma entrada aqui.
 */
export const RULES_BY_YEAR: Readonly<Record<number, Partial<MeiConfig>>> = Object.freeze({
  2026: {},
  // LC 238/2026 (21/10/2026), arts. 2º e 10: R$ 110.000 em 2027 e R$ 140.000 a partir de 2028.
  // A ampliação está condicionada à previsão de renúncia de receita nas leis orçamentárias de
  // 2027 a 2029 (art. 3º). O limite proporcional por mês sai da mesma conta: 110.000/12 e 140.000/12.
  2027: { annualLimitCents: 110_000_00 },
  2028: { annualLimitCents: 140_000_00 },
});

/**
 * Configuração efetiva de um ano: o padrão com as diferenças de todos os anos até ele.
 * A regra de um ano vale para os seguintes até que uma lei a mude.
 */
export function rulesFor(
  year: number,
  table: Readonly<Record<number, Partial<MeiConfig>>> = RULES_BY_YEAR,
): Readonly<MeiConfig> {
  const merged: MeiConfig = { ...DEFAULT_MEI_CONFIG };
  const years = Object.keys(table)
    .map(Number)
    .filter((y) => y <= year)
    .sort((a, b) => a - b);
  for (const y of years) Object.assign(merged, table[y]);
  return Object.freeze(merged);
}
