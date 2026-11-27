"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { Logo } from "./logo";
import { SECTIONS } from "@/lib/links";

type Theme = "dark" | "light";

/** Qual palco está sob a barra: cada seção diz o seu com data-nav="dark" ou "light". */
function stageUnderBar(): Theme {
  const layers = document.elementsFromPoint(window.innerWidth / 2, 28);
  for (const el of layers) {
    if (el.closest("header")) continue;
    const stage = el.closest<HTMLElement>("[data-nav]");
    if (stage) return stage.dataset.nav === "light" ? "light" : "dark";
  }
  return "dark";
}

/** A seção em leitura: a última cujo topo já passou de 40% da altura da tela. */
function sectionInView(): string | null {
  let current: string | null = null;
  for (const { id } of SECTIONS) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) current = id;
  }
  return current;
}

/**
 * Barra fina. Transparente sobre o hero; ao rolar, ganha vidro na cor do palco que está embaixo,
 * e o logo acompanha a cor do texto. No computador, os atalhos das seções, com a atual marcada.
 */
export function Header() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [active, setActive] = useState<string | null>(null);
  useMotionValueEvent(scrollY, "change", (y) => {
    setSolid(y > 24);
    setTheme(stageUnderBar());
    setActive(sectionInView());
  });

  const light = solid && theme === "light";
  const glass = light ? "border-line-light bg-paper/78 text-graphite" : "border-line-dark bg-ink/72 text-snow";

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color,color] duration-500 ${
        solid ? `${glass} backdrop-blur-xl backdrop-saturate-150` : "border-transparent bg-transparent text-snow"
      }`}
    >
      <nav aria-label="Principal" className="mx-auto flex h-14 max-w-[80rem] items-center justify-between px-4 sm:px-6 lg:px-10">
        <a href="#topo" aria-label="Teto, voltar ao início" className="-m-2 rounded-lg p-2">
          <Logo className="w-[3.9rem]" />
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {SECTIONS.map(({ id, label }) => {
            const current = active === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={current ? "true" : undefined}
                  className={`flex h-9 items-center rounded-full px-3.5 text-[0.8125rem] font-medium tracking-[-0.005em] transition-[color,background-color] duration-300 ${
                    current
                      ? light
                        ? "bg-graphite/8 text-graphite"
                        : "bg-snow/12 text-snow"
                      : light
                        ? "text-mute-light hover:text-graphite"
                        : "text-mute-dark hover:text-snow"
                  }`}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </motion.header>
  );
}
