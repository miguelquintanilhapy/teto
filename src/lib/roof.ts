/**
 * Os pontos de um telhado pontilhado, calculados um a um. Um tracejado no SVG espalha os pontos a partir da ponta
 * esquerda; como o lado do telhado quase nunca é múltiplo do espaçamento, o topo fica sem ponto e o lado direito
 * sai torto. Aqui há sempre um ponto em cada ponta e um no topo, espelhados.
 */
export function roofDots(
  { left, right, base, peak }: { left: number; right: number; base: number; peak: number },
  perSide: number,
): ReadonlyArray<readonly [number, number]> {
  const steps = perSide * 2;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const x = round(left + (right - left) * t);
    const y = round(peak + (base - peak) * Math.abs(1 - 2 * t));
    return [x, y] as const;
  });
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
