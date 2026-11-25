"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClockCounterClockwise, FileArrowUp, Gauge } from "@phosphor-icons/react/dist/ssr";

const TABS = [
  { href: "/", label: "Painel", Icon: Gauge },
  { href: "/historico", label: "Histórico", Icon: ClockCounterClockwise },
] as const;

/**
 * Barra flutuante: duas abas num vidro e, separada, a ação principal "Enviar nota".
 * A ação principal fica no alcance do polegar e escrita por extenso (reconhecer vence lembrar).
 */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[430px] gap-3 px-4 pb-[max(1.375rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass flex rounded-[2rem] p-1" style={{ background: "var(--tabbar)" }}>
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`pressable flex h-[3.5rem] w-[clamp(4.25rem,22vw,5.375rem)] flex-col items-center justify-center gap-0.5 rounded-[1.75rem] text-xs font-semibold ${
                active ? "text-action" : "text-label-2"
              }`}
              style={active ? { background: "var(--selected)" } : undefined}
            >
              <Icon size={26} weight={active ? "fill" : "regular"} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
      <Link
        href="/enviar"
        className="pressable flex h-[3.875rem] min-w-0 flex-1 items-center justify-center gap-2 rounded-[2rem] bg-primary px-3 text-[1.125rem] font-semibold whitespace-nowrap text-on-primary shadow-[var(--glow)]"
      >
        <FileArrowUp size={24} weight="bold" aria-hidden="true" />
        Enviar nota
      </Link>
    </nav>
  );
}
