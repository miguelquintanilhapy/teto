"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, ClockCounterClockwise, DotsThreeCircle, FileArrowUp, Gauge } from "@phosphor-icons/react/dist/ssr";

const TABS = [
  { href: "/", label: "Painel", Icon: Gauge },
  { href: "/simular", label: "Simular", Icon: Calculator },
  { href: "/historico", label: "Histórico", Icon: ClockCounterClockwise },
  { href: "/perfil", label: "Mais", Icon: DotsThreeCircle },
] as const;

/**
 * Barra flutuante: quatro abas num vidro e, separado, o botão de enviar nota (a ação principal), no alcance do polegar.
 * As larguras são em px de propósito: com o texto do sistema ampliado, a barra não pode estourar a largura da tela.
 */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[430px] items-center justify-between gap-2.5 px-4 pb-[max(1.375rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass flex min-w-0 rounded-[2rem] p-1" style={{ background: "var(--tabbar)" }}>
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`pressable flex h-[3.5rem] w-[clamp(52px,16.5vw,68px)] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.75rem] ${
                active ? "text-action" : "text-label-2"
              }`}
              style={active ? { background: "var(--selected)" } : undefined}
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
