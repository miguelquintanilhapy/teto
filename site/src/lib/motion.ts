/** Curva de saída suave usada em todo o site (desacelera no fim, sem ricochete). */
export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Entrada de baixo para cima com fundido. É sempre a mesma no servidor e no navegador:
 * quem tira o movimento para quem pediu "reduzir movimento" é o MotionConfig (em Providers),
 * que zera o deslocamento e mantém só o fundido. Trocar as props conforme a preferência deixava
 * o elemento preso em opacidade 0 depois da hidratação.
 */
export function fadeUp(delay = 0, distance = 16) {
  return {
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.9, ease: EASE },
  };
}
