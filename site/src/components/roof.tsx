"use client";

import { motion, type MotionValue } from "motion/react";

/** Pontos do telhado pontilhado (limite + 20%), da beirada até a cumeeira e de volta. */
const DOTS: Array<[number, number, number]> = [
  [20, 110, 0], [56, 88, 1], [92, 66, 2], [128, 44, 3], [164, 22, 4], [200, 0, 5],
  [236, 22, 4], [272, 44, 3], [308, 66, 2], [344, 88, 1], [380, 110, 0],
];

/**
 * O telhado da marca, no mesmo desenho da "sala" do app: o traço cheio é o limite,
 * o pontilhado âmbar é o limite com 20% de tolerância, onde o risco começa.
 * O traço se desenha e os pontos acendem da beirada para a cumeeira.
 */
export function Roof({
  className = "",
  delay = 0,
  lift,
  stroke = "#ffffff",
}: {
  className?: string;
  delay?: number;
  /** Deslocamento vertical do pontilhado, ligado à rolagem (o telhado da tolerância "sobe"). */
  lift?: MotionValue<number>;
  stroke?: string;
}) {
  return (
    <svg viewBox="-12 -12 424 178" className={className} aria-hidden="true" overflow="visible">
      <motion.g style={lift ? { y: lift } : undefined}>
        {DOTS.map(([cx, cy, i]) => (
          <motion.circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={6.5}
            fill="var(--color-warn)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay + 0.9 + i * 0.07, type: "spring", stiffness: 420, damping: 18 }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        ))}
      </motion.g>
      <motion.path
        d="M20,152 L200,40 L380,152"
        fill="none"
        stroke={stroke}
        strokeWidth={15}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay, duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}
