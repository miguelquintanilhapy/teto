"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties } from "react";
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
 *
 * No computador (a partir de `lg`), a mesma barra vira uma barra lateral fixa à esquerda: o nome do app no topo, o
 * botão de enviar escrito por extenso e as abas em linhas, com a cápsula deslizando na vertical.
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
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[430px] items-center justify-between gap-2.5 px-4 pb-[max(1.375rem,env(safe-area-inset-bottom))] lg:top-0 lg:right-auto lg:mx-0 lg:w-64 lg:max-w-none lg:flex-col lg:items-stretch lg:justify-start lg:gap-1.5 lg:border-r lg:border-sep lg:bg-bg lg:px-4 lg:py-7"
    >
      <div className="hidden items-center gap-2.5 px-2 pb-[22px] text-[1.375rem] font-extrabold tracking-tight lg:flex">
        <Image src="/icon.png" alt="" width={34} height={34} unoptimized className="size-[34px] rounded-[9px]" />
        Teto
      </div>
      <div
        className="glass relative flex min-w-0 rounded-[2rem] p-1 lg:order-2 lg:w-full lg:flex-col lg:rounded-none lg:border-0 lg:bg-transparent! lg:p-0 lg:shadow-none lg:backdrop-blur-none"
        style={{ background: "var(--tabbar)" }}
      >
        {index >= 0 && (
          // O deslocamento vem de --tab-i (globals.css): na horizontal no celular, na vertical na barra lateral.
          <span
            aria-hidden="true"
            className="tab-capsule pointer-events-none absolute top-1 bottom-1 left-1 w-[clamp(52px,16.5vw,68px)] lg:top-0 lg:bottom-auto lg:left-0 lg:h-12 lg:w-full"
            style={{ "--tab-i": index } as CSSProperties}
          >
            {/* A chave reinicia a esticada a cada troca (só depois do primeiro toque); o deslize é a transição do pai. */}
            {/* Na barra lateral, o fundo é o do cartão: o --selected do tema escuro some sobre o fundo preto. */}
            <span
              key={index}
              className={`block size-full rounded-[1.75rem] bg-[var(--selected)] lg:rounded-[14px] lg:bg-card ${tapped ? "tab-capsule-body" : ""}`}
            />
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
              className={`pressable tab-label relative flex h-[3.5rem] w-[clamp(52px,16.5vw,68px)] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.75rem] lg:h-12 lg:w-full lg:flex-row lg:justify-start lg:gap-3 lg:rounded-[14px] lg:px-3.5 ${
                active ? "text-action" : "text-label-2"
              }`}
            >
              <Icon size={24} weight={active ? "fill" : "regular"} aria-hidden="true" className="shrink-0" />
              <span className="max-w-full truncate px-0.5 text-[0.6875rem] leading-tight font-semibold lg:px-0 lg:text-base">{label}</span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/enviar"
        aria-label="Enviar nota"
        className="pressable flex size-[62px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full bg-primary text-on-primary shadow-[var(--glow)] lg:order-1 lg:mb-[18px] lg:h-[52px] lg:w-full lg:flex-row lg:gap-2"
      >
        <FileArrowUp size={24} weight="bold" aria-hidden="true" />
        <span className="text-[11px] leading-none font-bold lg:text-[1.0625rem]" aria-hidden="true">
          Enviar<span className="hidden lg:inline"> nota</span>
        </span>
      </Link>
    </nav>
  );
}
