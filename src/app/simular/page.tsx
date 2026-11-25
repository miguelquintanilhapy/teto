import { Suspense } from "react";
import { NoProfile } from "@/components/no-profile";
import { yearOf } from "@/core";
import { Simulator } from "@/components/simulate/simulator";
import { SheetShell } from "@/components/send/sheet-shell";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Simular venda · Teto" };

export default function SimularPage() {
  return (
    <SheetShell title="Simular venda">
      <Suspense fallback={<div aria-busy="true" className="h-40 rounded-card bg-card" />}>
        <Conteudo />
      </Suspense>
    </SheetShell>
  );
}

async function Conteudo() {
  const r = await loadPanelSafe("simular");
  if (!r.ok) {
    return (
      <>
        {r.reason === "no_profile" ? (
          <NoProfile />
        ) : (
          <p role="alert" className="t-body rounded-card bg-card p-5">
            Não foi possível carregar os dados. Tente de novo em instantes.
          </p>
        )}
      </>
    );
  }
  const { panel } = r;
  return (
    <Simulator
      ctx={{
        year: yearOf(panel.today),
        limitCents: panel.dashboard.limitCents,
        accumulatedCents: panel.dashboard.accumulatedCents,
      }}
    />
  );
}
