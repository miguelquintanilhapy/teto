"use client";

import { motion } from "motion/react";
import { EASE } from "@/lib/motion";

const TAGS = { div: motion.div, p: motion.p, h2: motion.h2, h3: motion.h3, li: motion.li, figure: motion.figure } as const;

/**
 * Entra uma vez, quando chega perto do meio da tela: sobe um pouco e aparece.
 * Com "reduzir movimento", o MotionConfig tira o deslocamento e deixa só o fundido.
 */
export function Reveal({
  as = "div",
  delay = 0,
  y = 24,
  className,
  children,
  id,
}: {
  as?: keyof typeof TAGS;
  delay?: number;
  y?: number;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const Tag = TAGS[as];
  return (
    <Tag
      id={id}
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.95, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}
