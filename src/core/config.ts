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
