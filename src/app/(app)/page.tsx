import Link from "next/link";
import { Suspense } from "react";
import { User } from "@phosphor-icons/react/dist/ssr";
import { monthOf, yearOf } from "@/core";
import { Bento } from "@/components/panel/bento";
import { Forecast } from "@/components/panel/forecast";
import { Hero } from "@/components/panel/hero";
import { MonthlyChart } from "@/components/panel/monthly-chart";
import { QuickEntry } from "@/components/panel/quick-entry";
import { loadPanelSafe } from "@/server/panel-safe";

export default function PainelPage() {
  return (
    <main>
      <Suspense fallback={<PainelSkeleton />}>
        <PainelConteudo />
      </Suspense>
    </main>
  );
}

function Mensagem({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <>
      <h1 className="t-large-title mt-2 mb-4">Painel</h1>
      <div role="alert" className="rounded-card bg-card p-5">
        <h2 className="t-headline">{titulo}</h2>
        <p className="t-body mt-1 text-label-2">{texto}</p>
      </div>
    </>
  );
}

async function PainelConteudo() {
  const r = await loadPanelSafe("painel");
  if (!r.ok) {
    return r.reason === "no_profile" ? (
      <Mensagem titulo="Perfil de demonstração não encontrado" texto="Rode npm run seed para criar os dados de demonstração." />
    ) : (
      <Mensagem titulo="Não foi possível carregar o painel" texto="Tente de novo em instantes." />
    );
  }
  const panel = r.panel;

  const { dashboard, profile, months, today } = panel;
  const year = yearOf(today);
  const opensThisYear = yearOf(profile.openingDate) === year;
  const firstMonth = opensThisYear ? monthOf(profile.openingDate) - 1 : 0;

  return (
    <>
      <header className="mt-2 mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="t-large-title">Painel</h1>
          <p className="t-body mt-0.5 truncate text-label-2">
            {profile.name} · {year}
          </p>
        </div>
        <Link href="/perfil" aria-label="Perfil e regras" className="glass grid size-11 shrink-0 place-items-center rounded-full text-label">
          <User size={20} weight="bold" aria-hidden="true" />
        </Link>
      </header>
      <div className="flex flex-col gap-3">
        <Hero dashboard={dashboard} />
        <Forecast dashboard={dashboard} />
        <Bento dashboard={dashboard} />
        <MonthlyChart year={year} months={months} firstMonth={firstMonth} currentMonth={monthOf(today) - 1} />
        <QuickEntry />
      </div>
    </>
  );
}

function PainelSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando o painel">
      <h1 className="t-large-title mt-2 mb-4">Painel</h1>
      <div className="flex flex-col gap-3">
        <div className="h-[16.5rem] rounded-card bg-card" />
        <div className="h-44 rounded-card bg-card" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-[8.25rem] rounded-card bg-card" />
          <div className="h-[8.25rem] rounded-card bg-card" />
        </div>
      </div>
    </div>
  );
}
