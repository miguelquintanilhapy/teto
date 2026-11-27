import { Suspense } from "react";
import { NoProfile } from "@/components/no-profile";
import { yearOf } from "@/core";
import { Simulator } from "@/components/simulate/simulator";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Simular · Teto" };

/** Aba própria: o simulador é o diferencial do Teto e ficava escondido no meio de um cartão do Painel. */
export default function SimularPage() {
  return (
    <main className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
      <header className="mt-2 mb-4 lg:col-span-2">
        <h1 className="t-large-title">Simular</h1>
        <p className="t-body mt-0.5 text-label-2">E se eu aceitar uma venda de R$ X?</p>
      </header>
      <Suspense fallback={<div aria-busy="true" className="h-40 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Conteudo />
      </Suspense>
    </main>
  );
}

async function Conteudo() {
  const r = await loadPanelSafe("simular");
  if (!r.ok) {
    return r.reason === "no_profile" ? (
      <NoProfile />
    ) : (
      <p role="alert" className="t-body rounded-card bg-card p-5">
        Não foi possível carregar os dados. Tente de novo em instantes.
      </p>
    );
  }
  const { panel } = r;
  return (
    <Simulator
      ctx={{
        year: yearOf(panel.today),
        limitCents: panel.dashboard.limitCents,
        accumulatedCents: panel.dashboard.accumulatedCents,
        openingDate: panel.profile.openingDate,
      }}
    />
  );
}
