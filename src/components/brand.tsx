/**
 * A marca do Teto desenhada em SVG (o telhado sobre o T), na cor do texto: funciona nos temas claro e escuro
 * sem trocar de imagem.
 */
export function BrandMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M3 10.5 L12 3.5 L21 10.5" strokeWidth="2.6" />
      <path d="M7.5 12.5 H16.5 M12 12.5 V21" strokeWidth="2.6" />
    </svg>
  );
}

/** A sala vazia, com o telhado: ilustração para páginas sem conteúdo (404, nada encontrado). */
export function EmptyRoom({ className }: { className?: string }) {
  return (
    <svg width="96" height="108" viewBox="0 0 104 116" fill="none" aria-hidden="true" className={className}>
      <path d="M10,46 Q10,42 14,42 H90 Q94,42 94,46 V96 Q94,110 80,110 H24 Q10,110 10,96 Z" fill="var(--track)" stroke="var(--label-2)" strokeOpacity="0.45" strokeWidth="1.5" />
      <path d="M10,42 L52,15 L94,42" stroke="var(--label)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10,12 L52,-15 L94,12" stroke="var(--warn)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.1 11" transform="translate(0 4)" />
    </svg>
  );
}
