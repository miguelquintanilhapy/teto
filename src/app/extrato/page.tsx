import { Suspense } from "react";
import { SheetShell } from "@/components/send/sheet-shell";
import { StatementImporter } from "@/components/statement/statement-importer";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Extrato · Teto" };

export default function ExtratoPage() {
  return (
    <SheetShell title="Extrato" closeHref="/historico">
      <Suspense fallback={<div aria-busy="true" className="h-56 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Conteudo />
      </Suspense>
    </SheetShell>
  );
}

async function Conteudo() {
  const r = await loadPanelSafe("extrato");
  if (!r.ok) {
    return (
      <p role="alert" className="t-body rounded-card bg-card p-5">
        {r.reason === "no_profile" ? "Cadastre o MEI antes de conciliar o extrato." : "Não foi possível carregar os lançamentos. Tente de novo em instantes."}
      </p>
    );
  }
  const receipts = r.panel.transactions
    .filter((t) => t.kind === "receita" && t.status === "confirmada")
    .map((t) => ({ id: t.id, date: t.date, amountCents: t.amountCents, description: t.description }));
  return <StatementImporter receipts={receipts} />;
}
