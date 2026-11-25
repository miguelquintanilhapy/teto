import Link from "next/link";
import { Suspense } from "react";
import { User } from "@phosphor-icons/react/dist/ssr";
import { monthOf, yearOf } from "@/core";
import { Bento } from "@/components/panel/bento";
import { Forecast } from "@/components/panel/forecast";
import { Hero } from "@/components/panel/hero";
import { LimitExplainer } from "@/components/panel/limit-explainer";
import { PrivacyToggle } from "@/components/prefs/privacy-toggle";
import { MonthlyChart } from "@/components/panel/monthly-chart";
import { QuickEntry } from "@/components/panel/quick-entry";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Painel · Teto" };

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
      <>
        <h1 className="t-large-title mt-2 mb-4">Painel</h1>
        <section className="rounded-card bg-card p-6 text-center">
          <h2 className="t-title">Cadastre seu MEI</h2>
          <p className="t-body mt-2 text-label-2">Com o CNPJ e a data de abertura, o Teto calcula o seu limite e avisa antes de você estourar.</p>
          <Link href="/bem-vindo" className="mt-6 flex h-[3.375rem] w-full items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary">
            Começar
          </Link>
        </section>
      </>
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
        <div className="flex shrink-0 gap-2">
          <PrivacyToggle />
          <Link href="/perfil" aria-label="Perfil e regras" className="glass grid size-11 shrink-0 place-items-center rounded-full text-label">
            <User size={20} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </header>
      <div className="flex flex-col gap-3">
        <Hero dashboard={dashboard} />
        <LimitExplainer dashboard={dashboard} openingDate={profile.openingDate} />
        <Forecast dashboard={dashboard} openingDate={profile.openingDate} />
        <Bento dashboard={dashboard} />
        <MonthlyChart year={year} months={months} firstMonth={firstMonth} currentMonth={monthOf(today) - 1} />
        <QuickEntry />
      </div>
    </>
  );
}

function PainelSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando o painel" className="animate-pulse motion-reduce:animate-none">
      <header className="mt-2 mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="t-large-title">Painel</h1>
          <div className="mt-1.5 h-5 w-48 rounded bg-card" />
        </div>
        <div className="flex gap-2">
          <div className="size-11 rounded-full bg-card" />
          <div className="size-11 rounded-full bg-card" />
        </div>
      </header>
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
