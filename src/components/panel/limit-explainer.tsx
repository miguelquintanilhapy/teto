import Link from "next/link";
import { CaretRight, Info } from "@phosphor-icons/react/dist/ssr";
import { IconTile } from "@/components/icon-tile";

/**
 * "O que acontece se eu passar?": uma linha que leva às Regras do ano, onde as três faixas do limite são
 * explicadas. Antes o mesmo texto aparecia duplicado aqui e em /regras.
 */
export function LimitExplainer() {
  return (
    <Link href="/regras" className="pressable hoverable flex min-h-14 items-center gap-3.5 rounded-card bg-card px-5 py-3.5">
      {/* Explicação, não ação nem estado: o quadradinho fica neutro. */}
      <IconTile>
        <Info size={19} weight="fill" aria-hidden="true" />
      </IconTile>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.0625rem] font-semibold">Entenda o limite</span>
        <span className="t-sub block text-label-2">Tolerância de 20% e o que acontece se passar</span>
      </span>
      <CaretRight size={17} weight="bold" className="shrink-0 text-label-2" aria-hidden="true" />
    </Link>
  );
}
