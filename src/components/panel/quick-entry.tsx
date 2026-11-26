import Link from "next/link";
import { CaretRight, PencilSimple } from "@phosphor-icons/react/dist/ssr";

/**
 * Atalho para quem não tem nota (venda em dinheiro, Pix sem comprovante). É uma linha que abre o formulário,
 * e não um campo: antes parecia um campo de digitar com botão de enviar, e quem digitava ali não digitava nada.
 */
export function QuickEntry() {
  return (
    <Link href="/lancar" className="pressable hoverable flex min-h-14 items-center gap-3.5 rounded-card bg-card px-5 py-3.5">
      <span className="grid size-[1.875rem] shrink-0 place-items-center rounded-lg bg-tile text-label">
        <PencilSimple size={19} weight="fill" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.0625rem] font-semibold">Lançar sem nota</span>
        <span className="t-sub block text-label-2">Venda em dinheiro ou Pix sem comprovante</span>
      </span>
      <CaretRight size={17} weight="bold" className="shrink-0 text-label-2" aria-hidden="true" />
    </Link>
  );
}
