"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Phone } from "./phone";
import { Roof } from "./roof";
import { APP_URL } from "@/lib/links";
import { EASE, fadeUp } from "@/lib/motion";
import painel from "@/assets/telas/painel-escuro.webp";

/** Linha de título que sobe de dentro de uma máscara. */
function Line({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        initial={{ y: "105%" }}
        animate={{ y: "0%" }}
        transition={{ delay, duration: 1, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/**
 * Abertura. O celular é a "sala" do app; o telhado da marca pousa sobre ele,
 * como o telhado sobre o T do logo. Ao rolar, o texto recua e o pontilhado da tolerância sobe.
 */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const copyOpacity = useTransform(scrollYProgress, [0.06, 0.38], [1, 0]);
  const copyY = useTransform(scrollYProgress, [0.06, 0.38], [0, -48]);
  const stageY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const dotsLift = useTransform(scrollYProgress, [0, 0.6], [0, -26]);
  const glow = useTransform(scrollYProgress, [0, 0.6], [1, 0.4]);

  return (
    <section
      ref={ref}
      id="topo"
      aria-labelledby="hero-titulo"
      className="relative isolate overflow-hidden bg-ink px-4 pb-24 pt-28 sm:px-6 sm:pt-36 lg:pb-32"
    >
      {/* luz ambiente: âmbar da sala por baixo, azul da ação ao longe */}
      <motion.div
        aria-hidden="true"
        style={reduce ? undefined : { opacity: glow }}
        className="pointer-events-none absolute left-1/2 top-[44%] -z-10 h-[56rem] w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_159_10/0.16),rgb(10_111_223/0.07)_55%,transparent)] blur-2xl"
      />

      <motion.div
        style={reduce ? undefined : { opacity: copyOpacity, y: copyY }}
        className="mx-auto flex max-w-[60rem] flex-col items-center text-center"
      >
        <motion.p {...fadeUp(0.1)} className="eyebrow text-warn">
          Para o microempreendedor individual
        </motion.p>
        <h1 id="hero-titulo" className="display mt-5 text-snow text-[clamp(3.25rem,1.4rem+8.2vw,8.75rem)]">
          <Line delay={0.2}>Quanto falta</Line>
          <Line delay={0.32}>
            <span className="text-mute-dark">para o</span> teto.
          </Line>
        </h1>
        <motion.p {...fadeUp(0.55)} className="lead mt-7 max-w-[34rem] text-mute-dark">
          O Teto soma o que o seu MEI fatura, mostra quanto ainda cabe no limite do ano e avisa antes de você passar dele.
        </motion.p>
        <motion.div {...fadeUp(0.7)} className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          <a href={APP_URL} className="btn btn-primary">
            Abrir o Teto
          </a>
          <a href="#problema" className="link-arrow">
            Ver como funciona
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="mt-px">
              <path d="M7 2v9m0 0L3 7m4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </motion.div>
      </motion.div>

      <motion.div style={reduce ? undefined : { y: stageY }} className="relative mx-auto mt-16 w-[min(70vw,20.5rem)] sm:mt-20 lg:w-[21.5rem]">
        <Roof
          delay={0.65}
          lift={reduce ? undefined : dotsLift}
          className="relative left-1/2 -mb-[5%] block w-[138%] max-w-none -translate-x-1/2"
        />
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 1.3, ease: EASE }}
        >
          <Phone
            src={painel}
            preload
            className="drop-shadow-[0_50px_80px_rgb(0_0_0/0.7)]"
            alt="Painel do Teto: faturamento de 2026 de R$ 59.160,50, selo Atenção, 88% do limite e ainda cabem R$ 8.339. Limite de R$ 67.500; com os 20% de tolerância, R$ 81.000."
          />
        </motion.div>
        <motion.p {...fadeUp(1.4)} className="mt-8 text-center text-xs text-mute-dark">
          Tela real do app, com dados fictícios de demonstração.
        </motion.p>
      </motion.div>
    </section>
  );
}
