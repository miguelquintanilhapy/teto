/**
 * A marca do Teto desenhada em SVG (o telhado sobre o T), na cor do texto: funciona nos temas claro e escuro
 * sem trocar de imagem.
 */
export function BrandMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M2 11 L12 3 L22 11" strokeWidth="2.4" />
      <path d="M5.5 14 H18.5 M12 14 V22" strokeWidth="2.4" />
    </svg>
  );
}

/** Os pontos do telhado de cima, calculados um a um para ficarem simétricos, com um ponto no topo (um tracejado
 * espalharia os pontos a partir da ponta esquerda e deixaria o lado direito torto). */
const ROOF_DOTS = Array.from({ length: 11 }, (_, i) => {
  const t = i / 10;
  return [10 + 84 * t, -11 + 27 * Math.abs(1 - 2 * t)] as const;
});

/** A sala vazia, com o telhado: ilustração para páginas sem conteúdo (404, nada encontrado). */
export function EmptyRoom({ className }: { className?: string }) {
  return (
    <svg width="96" height="128" viewBox="0 -22 104 138" fill="none" aria-hidden="true" className={className}>
      <path d="M10,46 Q10,42 14,42 H90 Q94,42 94,46 V96 Q94,110 80,110 H24 Q10,110 10,96 Z" fill="var(--track)" stroke="var(--label-2)" strokeOpacity="0.45" strokeWidth="1.5" />
      <path d="M10,42 L52,15 L94,42" stroke="var(--label)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      {ROOF_DOTS.map(([cx, cy]) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy} r="3.25" fill="var(--warn)" />
      ))}
    </svg>
  );
}
