import { roofDots } from "@/lib/roof";

/** A sala vazia, com o telhado: ilustração para páginas sem conteúdo (404, nada encontrado). */
export function EmptyRoom({ className }: { className?: string }) {
  return (
    <svg width="96" height="128" viewBox="0 -22 104 138" fill="none" aria-hidden="true" className={className}>
      <path d="M10,46 Q10,42 14,42 H90 Q94,42 94,46 V96 Q94,110 80,110 H24 Q10,110 10,96 Z" fill="var(--track)" stroke="var(--label-2)" strokeOpacity="0.45" strokeWidth="1.5" />
      <path d="M10,42 L52,15 L94,42" stroke="var(--label)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      {roofDots({ left: 10, right: 94, base: 16, peak: -11 }, 5).map(([cx, cy]) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy} r="3.25" fill="var(--warn)" />
      ))}
    </svg>
  );
}
