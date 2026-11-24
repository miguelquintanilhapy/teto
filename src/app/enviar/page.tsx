import { Suspense } from "react";
import { yearOf } from "@/core";
import { SendFlow } from "@/components/send/send-flow";
import { SheetShell } from "@/components/send/sheet-shell";
import { getTransactionsDeps } from "@/server/composition";
import { loadPanel } from "@/server/panel";

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
  let panel;
  try {
    panel = await loadPanel(getTransactionsDeps());
  } catch (e) {
    console.error("enviar: falha ao carregar", e instanceof Error ? e.message.slice(0, 200) : "erro desconhecido");
    return (
      <SheetShell title="Enviar nota">
        <p role="alert" className="t-body rounded-card bg-card p-5">
          Não foi possível preparar o envio. Tente de novo em instantes.
        </p>
      </SheetShell>
    );
  }
  if (!panel) {
    return (
      <SheetShell title="Enviar nota">
        <p role="alert" className="t-body rounded-card bg-card p-5">
          Perfil de demonstração não encontrado. Rode npm run seed.
        </p>
      </SheetShell>
    );
  }

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
