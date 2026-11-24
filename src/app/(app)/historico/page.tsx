import Link from "next/link";
import { Suspense } from "react";
import { NoProfile } from "@/components/no-profile";
import { HistoryList } from "@/components/history/history-list";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Histórico · Teto" };

export default function HistoricoPage() {
  return (
    <main>
      <div className="mt-2 mb-3 flex items-center justify-between gap-3">
        <h1 className="t-large-title">Histórico</h1>
        <Link href="/extrato" className="glass pressable inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[0.9375rem] font-semibold">
          Conciliar extrato
        </Link>
      </div>
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
      <div className="mb-4 flex gap-2">
        {[88, 124, 96].map((w) => (
          <div key={w} className="h-10 rounded-full bg-card" style={{ width: w }} />
        ))}
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
  return <HistoryList transactions={r.panel.transactions} />;
}
