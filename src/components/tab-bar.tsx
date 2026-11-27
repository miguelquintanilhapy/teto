
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties } from "react";
import {
  Calculator,
  ClockCounterClockwise,
  DotsThreeCircle,
  FileArrowUp,
  Gauge,
  PaperPlaneTilt,
} from "@phosphor-icons/react/dist/ssr";
import { activeTabIndex } from "@/lib/tabs";

const TABS = [
  { href: "/", label: "Painel", Icon: Gauge },
  { href: "/simular", label: "Simular", Icon: Calculator },
  { href: "/historico", label: "Histórico", Icon: ClockCounterClockwise },
  { href: "/perfil", label: "Mais", Icon: DotsThreeCircle },
] as const;

const HREFS = TABS.map((t) => t.href);

const CENTER_SLOT = 2;
const slotOf = (tab: number) => (tab < CENTER_SLOT ? tab : tab + 1);

export function TabBar() {
  const pathname = usePathname();

  const [tapped, setTapped] = useState<{
    index: number;
    from: string;
  } | null>(null);

  const routeIndex = activeTabIndex(pathname, HREFS);
  const index = tapped && tapped.from === pathname
    ? tapped.index
    : routeIndex;

  const tab = (i: number) => {
    const { href, label, Icon } = TABS[i]!;
    const active = i === index;

    return (
      <Link
        key={href}
        href={href}
        aria-current={i === routeIndex ? "page" : undefined}
        onClick={() => setTapped({ index: i, from: pathname })}
        className={`pressable tab-label relative flex h-[3.5rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.75rem] lg:h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-[14px] lg:px-3.5 ${
          active ? "text-action" : "text-label-2"
        }`}
      >
        <Icon
          size={24}
          weight={active ? "fill" : "regular"}
          aria-hidden="true"
          className="shrink-0"
        />
        <span className="max-w-full truncate px-0.5 text-[0.6875rem] leading-tight font-semibold lg:px-0 lg:text-base">
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] px-4 pb-[max(1.375rem,env(safe-area-inset-bottom))] lg:inset-y-0 lg:right-auto lg:mx-0 lg:flex lg:w-64 lg:max-w-none lg:flex-col lg:items-stretch lg:justify-start lg:gap-1.5 lg:border-r lg:border-sep lg:bg-bg lg:px-4 lg:py-7"
    >
      {/* Identidade do Teto: somente desktop */}
      <div className="hidden items-center gap-2.5 px-2 pb-[22px] text-[1.375rem] font-extrabold tracking-tight lg:order-0 lg:flex">
        <Image
          src="/icon.png"
          alt=""
          width={34}
          height={34}
          unoptimized
          className="size-[34px] rounded-[9px]"
        />
        Teto
      </div>

      {/* Navegação */}
      <div
        className="glass relative grid grid-cols-5 rounded-[2rem] p-1 lg:order-2 lg:mt-0 lg:flex lg:w-full lg:flex-col lg:rounded-none lg:border-0 lg:bg-transparent! lg:p-0 lg:shadow-none lg:backdrop-blur-none"
        style={{ background: "var(--tabbar)" }}
      >
        {/* Cápsula animada: mobile */}
        {index >= 0 && (
          <span
            aria-hidden="true"
            className="tab-capsule pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/5)] lg:hidden"
            style={{
              transform: `translateX(${slotOf(index) * 100}%)`,
            }}
          >
            <span
              key={index}
              className={`block size-full rounded-[1.75rem] bg-[var(--selected)] ${
                tapped ? "tab-capsule-body" : ""
              }`}
            />
          </span>
        )}

        {/* Cápsula animada: desktop */}
        {index >= 0 && (
          <span
            aria-hidden="true"
            className="tab-capsule pointer-events-none absolute top-0 bottom-auto left-0 hidden h-12 w-full lg:block"
            style={{ "--tab-i": index } as CSSProperties}
          >
            <span
              key={index}
              className={`block size-full rounded-[14px] bg-card ${
                tapped ? "tab-capsule-body" : ""
              }`}
            />
          </span>
        )}

        {/* Primeiras duas abas */}
        {tab(0)}
        {tab(1)}

        {/* Ação central: mobile */}
        <Link
          href="/enviar"
          aria-label="Enviar nota"
          className="pressable relative flex h-[3.5rem] min-w-0 flex-col items-center justify-end pb-[0.3125rem] text-label-2 lg:hidden"
        >
          <span
            aria-hidden="true"
            className="absolute -top-[1.625rem] grid size-[3.5rem] place-items-center rounded-full bg-primary text-on-primary shadow-[var(--glow)]"
          >
            <PaperPlaneTilt size={26} weight="fill" />
          </span>
          <span className="text-[0.6875rem] leading-tight font-semibold whitespace-nowrap">
            Enviar nota
          </span>
        </Link>

        {/* Últimas duas abas */}
        {tab(2)}
        {tab(3)}
      </div>

      {/* Ação principal: desktop */}
      <Link
        href="/enviar"
        aria-label="Enviar nota"
        className="pressable hidden size-[52px] shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-on-primary shadow-[var(--glow)] lg:order-1 lg:mb-[18px] lg:flex lg:h-[52px] lg:w-full lg:rounded-[14px]"
      >
        <FileArrowUp size={24} weight="bold" aria-hidden="true" />
        <span className="text-[1.0625rem] font-bold">
          Enviar nota
        </span>
      </Link>
    </nav>
  );
}
