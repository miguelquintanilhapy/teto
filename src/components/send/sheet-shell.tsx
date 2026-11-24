import Link from "next/link";
import { X } from "@phosphor-icons/react/dist/ssr";

/** Casca de tela modal: botão de fechar de vidro à esquerda e título centralizado, como num sheet do iOS. */
export function SheetShell({ title, closeHref = "/", children }: { title?: string; closeHref?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-40">
      <header className="relative mb-5 flex h-11 items-center justify-center">
        <Link
          href={closeHref}
          aria-label="Fechar"
          className="glass absolute left-0 grid size-11 place-items-center rounded-full text-label"
        >
          <X size={20} weight="bold" aria-hidden="true" />
        </Link>
        {title && <h1 className="text-[1.125rem] font-semibold">{title}</h1>}
      </header>
      {children}
    </div>
  );
}

/** Rodapé fixo com a ação principal, ao alcance do polegar. */
export function BottomAction({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] bg-gradient-to-t from-bg from-60% to-transparent px-9 pt-10 pb-[max(2.25rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

export const primaryButton =
  "flex h-[3.375rem] w-full items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary shadow-[var(--shadow)] disabled:opacity-40";
