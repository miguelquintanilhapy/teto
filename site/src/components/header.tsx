"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { Logo } from "./logo";
import { APP_URL } from "@/lib/links";

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

/**
 * Barra fina. Transparente sobre o hero; ao rolar, ganha vidro na cor do palco que está embaixo
 * (escuro sobre as seções pretas, claro sobre as claras), e o logo acompanha a cor do texto.
 */
export function Header() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  useMotionValueEvent(scrollY, "change", (y) => {
    setSolid(y > 24);
    setTheme(stageUnderBar());
  });

  const glass =
    theme === "light"
      ? "border-line-light bg-paper/78 text-graphite"
      : "border-line-dark bg-ink/72 text-snow";

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
        <a href={APP_URL} className="btn btn-primary btn-small">
          Abrir o app
        </a>
      </nav>
    </motion.header>
  );
}
