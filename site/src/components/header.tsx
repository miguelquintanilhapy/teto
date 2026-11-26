"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { Logo } from "./logo";
import { APP_URL } from "@/lib/links";

/** Barra fina e translúcida. Transparente sobre o hero; ganha vidro quando a página rola. */
export function Header() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 24));

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-[background-color,border-color,backdrop-filter] duration-500 ${
        solid
          ? "border-b border-line-dark bg-ink/72 backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-transparent"
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
