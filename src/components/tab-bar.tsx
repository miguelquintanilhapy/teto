"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Calculator, ClockCounterClockwise, DotsThreeCircle, FileArrowUp, Gauge } from "@phosphor-icons/react/dist/ssr";
import { activeTabIndex } from "@/lib/tabs";

const TABS = [
  { href: "/", label: "Painel", Icon: Gauge },
  { href: "/simular", label: "Simular", Icon: Calculator },
  { href: "/historico", label: "Histórico", Icon: ClockCounterClockwise },
  { href: "/perfil", label: "Mais", Icon: DotsThreeCircle },
] as const;

const HREFS = TABS.map((t) => t.href);

/**
 * Barra flutuante: quatro abas num vidro e, separado, o botão de enviar nota (a ação principal), no alcance do polegar.
 * As larguras são em px de propósito: com o texto do sistema ampliado, a barra não pode estourar a largura da tela.
 *
 * A aba escolhida é marcada por uma cápsula só, que desliza de uma aba para a outra (como a barra do iOS), em vez de
 * sumir numa e aparecer na outra. Ela sai no toque, sem esperar a tela nova carregar.
 */
export function TabBar() {
  const pathname = usePathname();
  // O toque move a cápsula na hora; quando a rota muda, o caminho volta a mandar.
  const [tapped, setTapped] = useState<{ index: number; from: string } | null>(null);
  const routeIndex = activeTabIndex(pathname, HREFS);
  const index = tapped && tapped.from === pathname ? tapped.index : routeIndex;

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[430px] items-center justify-between gap-2.5 px-4 pb-[max(1.375rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass relative flex min-w-0 rounded-[2rem] p-1" style={{ background: "var(--tabbar)" }}>
        {index >= 0 && (
          <span
            aria-hidden="true"
            className="tab-capsule pointer-events-none absolute top-1 bottom-1 left-1 w-[clamp(52px,16.5vw,68px)]"
            style={{ transform: `translateX(${index * 100}%)` }}
          >
            {/* A chave reinicia a esticada a cada troca (só depois do primeiro toque); o deslize é a transição do pai. */}
            <span key={index} className={`block size-full rounded-[1.75rem] ${tapped ? "tab-capsule-body" : ""}`} style={{ background: "var(--selected)" }} />
          </span>
        )}
        {TABS.map(({ href, label, Icon }, i) => {
          const active = i === index;
          return (
            <Link
              key={href}
              href={href}
              aria-current={i === routeIndex ? "page" : undefined}
              onClick={() => setTapped({ index: i, from: pathname })}
              className={`pressable tab-label relative flex h-[3.5rem] w-[clamp(52px,16.5vw,68px)] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.75rem] ${
                active ? "text-action" : "text-label-2"
              }`}
            >
              <Icon size={24} weight={active ? "fill" : "regular"} aria-hidden="true" className="shrink-0" />
              <span className="max-w-full truncate px-0.5 text-[0.6875rem] leading-tight font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/enviar"
        aria-label="Enviar nota"
        className="pressable flex size-[62px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full bg-primary text-on-primary shadow-[var(--glow)]"
      >
        <FileArrowUp size={24} weight="bold" aria-hidden="true" />
        <span className="text-[11px] leading-none font-bold" aria-hidden="true">
          Enviar
        </span>
      </Link>
    </nav>
  );
}
