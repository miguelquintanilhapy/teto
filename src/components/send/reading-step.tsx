import { SpinnerGap } from "@phosphor-icons/react/dist/ssr";
import { BottomAction } from "./sheet-shell";

/** Espera honesta: sem porcentagem inventada, só o que está acontecendo e como cancelar. */
export function ReadingStep({ fileName, onCancel }: { fileName: string; onCancel: () => void }) {
  return (
    <>
      <section role="status" aria-live="polite" className="rounded-card bg-card p-6 text-center">
        <SpinnerGap size={44} weight="bold" aria-hidden="true" className="mx-auto animate-spin motion-reduce:animate-none" />
        <h2 className="t-title mt-4">Lendo a nota</h2>
        <p className="t-body mt-2 text-label-2">Pode levar alguns segundos.</p>
        <p className="t-sub mt-3 truncate text-label-2">{fileName}</p>
      </section>
      <BottomAction>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-[3.375rem] w-full items-center justify-center rounded-full bg-card text-[1.1875rem] font-semibold"
        >
          Cancelar
        </button>
      </BottomAction>
    </>
  );
}
