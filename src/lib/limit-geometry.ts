/**
 * Geometria da barra do limite, em frações da largura (0 a 1).
 *
 * `ratio` é o total depois da venda (ou nota), `addedRatio` o que ela acrescenta, ambos em relação ao limite.
 * `scaleMax` é até onde a barra vai: 1 = só até o limite; 1,2 = até o limite com 20% de tolerância.
 * O que já foi faturado nunca encolhe para dar lugar ao trecho novo (antes, quando a venda passava do limite,
 * a parte já usada diminuía e a barra mentia).
 */
export interface BarGeometry {
  /** Largura do que já estava faturado. */
  base: number;
  /** Largura do que esta venda ou nota acrescenta. */
  added: number;
  /** Onde fica o traço do limite (1 quando a escala termina no próprio limite). */
  limitAt: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(x) ? x : 0));

export function barGeometry(ratio: number, addedRatio: number, scaleMax = 1): BarGeometry {
  const scale = scaleMax > 0 ? scaleMax : 1;
  const after = clamp(ratio, 0, scale);
  const before = clamp(ratio - clamp(addedRatio, 0, Infinity), 0, scale);
  const base = before / scale;
  const end = after / scale;
  return { base, added: Math.max(0, end - base), limitAt: 1 / scale };
}
