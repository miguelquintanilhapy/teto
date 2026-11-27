"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Calculator, ClockCounterClockwise, DotsThreeCircle, Gauge, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { activeTabIndex } from "@/lib/tabs";

const TABS = [
  { href: "/", label: "Painel", Icon: Gauge },
  { href: "/simular", label: "Simular", Icon: Calculator },
  { href: "/historico", label: "Histórico", Icon: ClockCounterClockwise },
  { href: "/perfil", label: "Mais", Icon: DotsThreeCircle },
] as const;

const HREFS = TABS.map((t) => t.href);

/** Cinco lugares na barra: duas abas, o envio no meio, duas abas. A aba i ocupa o lugar i, ou i+1 depois do meio. */
const CENTER_SLOT = 2;
const slotOf = (tab: number) => (tab < CENTER_SLOT ? tab : tab + 1);

/**
 * Barra flutuante: quatro abas num vidro e, no meio, o envio de nota (a ação principal), num círculo que sai da
 * barra, ao alcance do polegar.
 *
 * A aba escolhida é marcada por uma cápsula só, que desliza de uma aba para a outra (como a barra do iOS) e pula o
 * lugar do meio. Ela sai no toque, sem esperar a tela nova carregar.
 */
export function TabBar() {
  const pathname = usePathname();
  // O toque move a cápsula na hora; quando a rota muda, o caminho volta a mandar.
  const [tapped, setTapped] = useState<{ index: number; from: string } | null>(null);
  const routeIndex = activeTabIndex(pathname, HREFS);
  const index = tapped && tapped.from === pathname ? tapped.index : routeIndex;

  const tab = (i: number) => {
    const { href, label, Icon } = TABS[i]!;
    const active = i === index;
    return (
      <Link
        key={href}
        href={href}
        aria-current={i === routeIndex ? "page" : undefined}
        onClick={() => setTapped({ index: i, from: pathname })}
        className={`pressable tab-label relative flex h-[3.5rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.75rem] ${
          active ? "text-action" : "text-label-2"
        }`}
      >
        <Icon size={24} weight={active ? "fill" : "regular"} aria-hidden="true" className="shrink-0" />
        <span className="max-w-full truncate px-0.5 text-[0.6875rem] leading-tight font-semibold">{label}</span>
      </Link>
    );
  };

  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] px-4 pb-[max(1.375rem,env(safe-area-inset-bottom))]">
      <div className="glass relative grid grid-cols-5 rounded-[2rem] p-1" style={{ background: "var(--tabbar)" }}>
        {index >= 0 && (
          <span
            aria-hidden="true"
            className="tab-capsule pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/5)]"
            style={{ transform: `translateX(${slotOf(index) * 100}%)` }}
          >
            {/* A chave reinicia a esticada a cada troca (só depois do primeiro toque); o deslize é a transição do pai. */}
            <span key={index} className={`block size-full rounded-[1.75rem] ${tapped ? "tab-capsule-body" : ""}`} style={{ background: "var(--selected)" }} />
          </span>
        )}
        {tab(0)}
        {tab(1)}
        {/* O envio de nota no meio: o círculo sai da barra, e o rótulo fica na linha das abas. */}
        <Link
          href="/enviar"
          className="pressable relative flex h-[3.5rem] min-w-0 flex-col items-center justify-end pb-[0.3125rem] text-action"
        >
          <span
            aria-hidden="true"
            className="absolute -top-[1.625rem] grid size-[3.5rem] place-items-center rounded-full bg-primary text-on-primary shadow-[var(--glow)]"
          >
            <PaperPlaneTilt size={26} weight="fill" />
          </span>
          <span className="text-[0.6875rem] leading-tight font-semibold whitespace-nowrap">Enviar nota</span>
        </Link>
        {tab(2)}
        {tab(3)}
      </div>
    </nav>
  );
}
