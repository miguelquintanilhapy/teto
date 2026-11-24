import { Suspense } from "react";
import { yearOf } from "@/core";
import { SendFlow } from "@/components/send/send-flow";
import { SheetShell } from "@/components/send/sheet-shell";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Enviar nota · Teto" };

export default function EnviarPage() {
  return (
    <Suspense
      fallback={
        <SheetShell title="Enviar nota">
          <div aria-busy="true" className="h-56 rounded-card bg-card" />
        </SheetShell>
      }
    >
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const r = await loadPanelSafe("enviar");
  if (!r.ok) {
    return (
      <SheetShell title="Enviar nota">
        <p role="alert" className="t-body rounded-card bg-card p-5">
          {r.reason === "no_profile"
            ? "Perfil de demonstração não encontrado. Rode npm run seed."
            : "Não foi possível preparar o envio. Tente de novo em instantes."}
        </p>
      </SheetShell>
    );
  }
  const panel = r.panel;

  return (
    <SendFlow
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
