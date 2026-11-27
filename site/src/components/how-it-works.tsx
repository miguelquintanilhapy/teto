"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { BellRinging, Camera, IdentificationCard } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Reveal } from "./reveal";
import { APP_URL } from "@/lib/links";

/** Os mesmos três passos da tela "Primeiros passos" do app, com o mesmo texto. */
const STEPS: Array<{ icon: Icon; title: string; body: string }> = [
  {
    icon: IdentificationCard,
    title: "Cadastre seu MEI",
    body: "Com o CNPJ e a data de abertura, o Teto calcula o seu limite. Abriu no meio do ano? O limite já sai proporcional.",
  },
  {
    icon: Camera,
    title: "Envie sua primeira nota",
    body: "Foto ou PDF. A IA lê, você confere, e só então a receita entra no limite. Venda sem nota também vale: é só lançar.",
  },
  {
    icon: BellRinging,
    title: "Ligue os alertas",
    body: "Receba um e-mail ao chegar em cada faixa do limite, antes de estourar.",
  },
];

/**
 * Como usar: três passos ligados por uma linha que se preenche com a rolagem
 * (na horizontal no computador, na vertical no celular).
 */
export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const progress = useSpring(useTransform(scrollYProgress, [0, 1], [0, 1]), { stiffness: 140, damping: 26 });

  return (
    <section id="como-usar" data-nav="dark" aria-labelledby="como-usar-titulo" className="bg-ink px-4 py-28 sm:px-6 sm:py-40 lg:px-10">
      <div className="mx-auto max-w-[80rem]">
        <Reveal as="p" className="eyebrow text-warn">
          Como usar
        </Reveal>
        <Reveal as="h2" id="como-usar-titulo" className="display mt-5 max-w-[15ch] text-[clamp(2.75rem,1.6rem+5vw,6rem)] text-snow">
          Três passos e o limite fica à vista.
        </Reveal>
        <Reveal as="p" delay={0.1} className="lead mt-7 max-w-[36rem] text-mute-dark">
          Sem planilha, sem instalar nada da loja. O Teto abre no navegador do celular, e você pode colocá-lo na tela
          inicial.
        </Reveal>

        <ol ref={ref} className="relative mt-20 grid gap-14 pl-12 sm:pl-14 lg:mt-28 lg:grid-cols-3 lg:gap-10 lg:pl-0 lg:pt-16">
          {/* trilho e preenchimento */}
          <span aria-hidden="true" className="absolute bottom-2 left-[1.0625rem] top-2 w-px bg-line-dark sm:left-[1.3125rem] lg:inset-x-0 lg:bottom-auto lg:left-0 lg:top-[1.3125rem] lg:h-px lg:w-auto" />
          <motion.span
            aria-hidden="true"
            style={{ scaleY: progress }}
            className="absolute bottom-2 left-[1.0625rem] top-2 w-px origin-top bg-warn sm:left-[1.3125rem] lg:hidden"
          />
          <motion.span
            aria-hidden="true"
            style={{ scaleX: progress }}
            className="absolute inset-x-0 top-[1.3125rem] hidden h-px origin-left bg-warn lg:block"
          />

          {STEPS.map(({ icon: StepIcon, title, body }, i) => (
            <Reveal as="li" key={title} delay={i * 0.08} className="relative">
              <span className="absolute -left-12 top-0 flex size-[2.25rem] items-center justify-center rounded-full border border-line-dark bg-ink text-sm font-semibold text-snow tabular sm:-left-14 sm:size-[2.75rem] lg:-top-16 lg:left-0">
                {i + 1}
              </span>
              <StepIcon size={30} weight="duotone" className="text-snow lg:mt-6" aria-hidden="true" />
              <h3 className="mt-5 text-[clamp(1.375rem,1.2rem+0.6vw,1.75rem)] font-semibold tracking-[-0.025em] text-snow">{title}</h3>
              <p className="mt-3 max-w-[24rem] text-[1.0625rem] leading-relaxed text-mute-dark">{body}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-20 lg:mt-24">
          <a href={APP_URL} className="btn btn-primary">
            Abrir o Teto
          </a>
        </Reveal>
      </div>
    </section>
  );
}
