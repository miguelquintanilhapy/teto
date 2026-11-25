import { Suspense } from "react";
import { NoProfile } from "@/components/no-profile";
import { SheetShell } from "@/components/send/sheet-shell";
import { rulesFor, yearOf } from "@/core";
import { limitExplainer } from "@/lib/copy";
import { formatPercent } from "@/lib/format";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Regras do ano · Teto" };

export default function RegrasPage() {
  return (
    <SheetShell title="Regras do ano" closeHref="/perfil">
      <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Conteudo />
      </Suspense>
    </SheetShell>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-5 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="t-row">{label}</p>
        <p className="sensitive shrink-0 text-[1.0625rem] font-semibold">{value}</p>
      </div>
      {hint && <p className="t-sub mt-0.5 text-label-2">{hint}</p>}
    </div>
  );
}

async function Conteudo() {
  const r = await loadPanelSafe("regras");
  if (!r.ok) {
    return r.reason === "no_profile" ? (
      <NoProfile />
    ) : (
      <p role="alert" className="t-body rounded-card bg-card p-5">
        Não foi possível carregar agora. Tente de novo em instantes.
      </p>
    );
  }
  const { profile, dashboard, today } = r.panel;
  const year = yearOf(today);
  const cfg = rulesFor(year);
  const faixas = limitExplainer(dashboard, profile.openingDate);

  return (
    <>
      <h2 className="mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">O limite em {year}</h2>
      <div className="divide-y divide-sep rounded-card bg-card">
        {faixas.map((f) => (
          <Row key={f.title} label={f.title} value={f.value} hint={f.text} />
        ))}
      </div>

      <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Avisos e prazos</h2>
      <div className="divide-y divide-sep rounded-card bg-card">
        <Row label="Alerta de atenção" value={formatPercent(cfg.warningRatio)} hint="do limite: o Painel muda para Atenção" />
        <Row label="Alerta crítico" value={formatPercent(cfg.criticalRatio)} hint="do limite: o Painel muda para Crítico" />
        <Row label="Vencimento do DAS" value={`dia ${cfg.dasDueDay}`} hint="de cada mês, referente ao mês anterior" />
      </div>
      <p className="t-sub mt-2 px-5 text-label-2">
        Só receita conta para o limite. Estas regras ficam no código do Teto e valem para {year}. Confirme sempre no Portal do Empreendedor ou com seu contador.
      </p>
    </>
  );
}
