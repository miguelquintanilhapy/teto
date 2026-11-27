import { Suspense } from "react";
import { NoProfile } from "@/components/no-profile";
import { HistoryList } from "@/components/history/history-list";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Histórico · Teto" };

export default function HistoricoPage() {
  return (
    // No computador (lg), uma coluna centralizada: uma lista de extrato esticada na tela toda fica difícil de ler.
    <main className="lg:mx-auto lg:max-w-[760px]">
      <h1 className="t-large-title mt-2 mb-3">Histórico</h1>
      <Suspense fallback={<HistoricoSkeleton />}>
        <Conteudo />
      </Suspense>
    </main>
  );
}

/** Esqueleto com a forma da lista: o usuário vê onde o conteúdo vai aparecer. */
function HistoricoSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando o histórico" className="animate-pulse motion-reduce:animate-none">
      <div className="h-11 rounded-2xl bg-card" />
      <div className="mt-3 h-11 rounded-2xl bg-card" />
      <div className="mt-4 mb-5 grid grid-cols-2 gap-2.5">
        <div className="h-[4.25rem] rounded-2xl bg-card" />
        <div className="h-[4.25rem] rounded-2xl bg-card" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-5">
          <div className="mb-2 ml-5 h-4 w-28 rounded bg-card" />
          <div className="h-[4.5rem] rounded-card bg-card" />
        </div>
      ))}
    </div>
  );
}

async function Conteudo() {
  const r = await loadPanelSafe("histórico");
  if (!r.ok) {
    return r.reason === "no_profile" ? (
      <NoProfile />
    ) : (
      <div role="alert" className="rounded-card bg-card p-5">
        <h2 className="t-headline">Não foi possível carregar o histórico</h2>
        <p className="t-body mt-1 text-label-2">Tente de novo em instantes.</p>
      </div>
    );
  }
  return <HistoryList transactions={r.panel.transactions} today={r.panel.today} openingDate={r.panel.profile.openingDate} />;
}
