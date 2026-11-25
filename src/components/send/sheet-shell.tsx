import { X } from "@phosphor-icons/react/dist/ssr";
import { CloseButton } from "@/components/nav/close-button";

/** Casca de tela modal: botão de fechar de vidro à esquerda e título centralizado, como num sheet do iOS. */
export function SheetShell({
  title,
  closeHref = "/",
  onClose,
  children,
}: {
  title?: string;
  closeHref?: string;
  /** Quando existe, o X chama isto (para pedir confirmação) em vez de navegar. */
  onClose?: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="page-enter mx-auto min-h-dvh w-full max-w-[430px] px-4 pt-[calc(env(safe-area-inset-top,0px)_+_1rem)] pb-40">
      <header className="no-print relative mb-5 flex h-11 items-center justify-center">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="glass pressable absolute left-0 grid size-11 place-items-center rounded-full text-label"
          >
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
        ) : (
          <CloseButton fallback={closeHref} className="glass pressable absolute left-0 grid size-11 place-items-center rounded-full text-label" />
        )}
        {title && <h1 className="text-[1.125rem] font-semibold">{title}</h1>}
      </header>
      {children}
    </main>
  );
}

/** Rodapé fixo com a ação principal, ao alcance do polegar. */
export function BottomAction({ children }: { children: React.ReactNode }) {
  return (
    <div className="bottom-action fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] bg-gradient-to-t from-bg from-60% to-transparent px-9 pt-10 pb-[max(2.25rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

export const primaryButton =
  "pressable flex h-[3.375rem] w-full items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary shadow-[var(--glow)] disabled:opacity-40";
