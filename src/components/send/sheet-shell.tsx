import { X } from "@phosphor-icons/react/dist/ssr";
import { CloseButton } from "@/components/nav/close-button";

/**
 * Casca de tela modal: botão de fechar de vidro à esquerda e título centralizado, como num sheet do iOS.
 *
 * No computador (`lg`), a folha ocupa a tela inteira, sem moldura. O conteúdo fica numa coluna centralizada de até
 * 760 px (formulários e textos longos ficam ilegíveis esticados), a não ser com `wide`: aí o conteúdo recebe a tela
 * toda e se organiza sozinho (o "escolher arquivo" do envio, centralizado no meio da tela).
 */
export function SheetShell({
  title,
  closeHref = "/",
  onClose,
  wide = false,
  children,
}: {
  title?: string;
  closeHref?: string;
  /** Quando existe, o X chama isto (para pedir confirmação) em vez de navegar. */
  onClose?: () => void;
  /** No computador, entrega a largura e a altura inteiras ao conteúdo, em vez da coluna centralizada. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="page-enter app-column app-sheet mx-auto min-h-dvh w-full max-w-[430px] px-4 pt-[calc(env(safe-area-inset-top,0px)_+_1rem)] pb-40 lg:flex lg:max-w-none lg:flex-col lg:px-16 lg:pt-9 lg:pb-14">
      <header className="no-print relative mb-5 flex h-11 items-center justify-center lg:mb-9">
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
        {title && <h1 className="text-[1.125rem] font-semibold lg:text-[1.375rem]">{title}</h1>}
      </header>
      <div className={wide ? "lg:flex lg:flex-1 lg:flex-col" : "lg:mx-auto lg:w-full lg:max-w-[760px]"}>{children}</div>
    </main>
  );
}

/** Rodapé fixo com a ação principal, ao alcance do polegar. No computador, a ação segue o conteúdo, sem ficar presa. */
export function BottomAction({ children }: { children: React.ReactNode }) {
  return (
    <div className="bottom-action fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] bg-gradient-to-t from-bg from-60% to-transparent px-4 pt-10 pb-[max(2.25rem,env(safe-area-inset-bottom))] lg:static lg:mt-8 lg:max-w-none lg:bg-none lg:p-0">
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

export const primaryButton =
  "pressable flex h-[3.375rem] w-full items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary shadow-[var(--glow)] disabled:opacity-40";
