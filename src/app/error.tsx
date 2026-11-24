"use client";

import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

/** Rede de segurança: qualquer erro inesperado vira uma tela clara, com uma saída. */
export default function Erro({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-4 pb-16">
      <section role="alert" className="rounded-card bg-card p-6 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-tile text-warn">
          <WarningCircle size={34} weight="fill" aria-hidden="true" />
        </span>
        <h1 className="t-title mt-4">Algo deu errado</h1>
        <p className="t-body mt-2 text-label-2">Não foi possível mostrar esta tela. Seus dados estão seguros.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 flex h-[3.375rem] w-full items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary"
        >
          Tentar de novo
        </button>
      </section>
    </main>
  );
}
