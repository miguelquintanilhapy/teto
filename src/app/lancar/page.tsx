import { Suspense } from "react";
import { NoProfile } from "@/components/no-profile";
import { yearOf } from "@/core";
import { SendFlow } from "@/components/send/send-flow";
import { SheetShell } from "@/components/send/sheet-shell";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Lançar sem nota · Teto" };

export default function LancarPage() {
  return (
    <Suspense
      fallback={
        <SheetShell title="Lançar sem nota">
          <div aria-busy="true" className="h-56 rounded-card bg-card" />
        </SheetShell>
      }
    >
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const r = await loadPanelSafe("lancar");
  if (!r.ok) {
    return (
      <SheetShell title="Lançar sem nota">
        <>
        {r.reason === "no_profile" ? (
          <NoProfile />
        ) : (
          <p role="alert" className="t-body rounded-card bg-card p-5">
            Não foi possível preparar o lançamento. Tente de novo em instantes.
          </p>
        )}
      </>
      </SheetShell>
    );
  }
  const { panel } = r;
  return (
    <SendFlow
      startManual
      ctx={{
        taxId: panel.profile.taxId,
        year: yearOf(panel.today),
        today: panel.today,
        limitCents: panel.dashboard.limitCents,
        accumulatedCents: panel.dashboard.accumulatedCents,
      }}
    />
  );
}
