import Link from "next/link";
import { Suspense } from "react";
import { monthOf, rulesFor, yearOf } from "@/core";
import { PrivacyToggle } from "@/components/prefs/privacy-toggle";
import { ThemeControl } from "@/components/prefs/theme-control";
import { SheetShell } from "@/components/send/sheet-shell";
import { formatPercent, formatReais, monthName } from "@/lib/format";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Perfil · Teto" };

export default function PerfilPage() {
  return (
    <SheetShell title="Perfil">
      <Suspense fallback={<div aria-busy="true" className="h-40 rounded-card bg-card" />}>
        <Conteudo />
      </Suspense>
    </SheetShell>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <p className="t-row">{label}</p>
        {hint && <p className="t-sub text-label-2">{hint}</p>}
      </div>
      <p className="t-row shrink-0 text-label-2">{value}</p>
    </div>
  );
}

function maskCnpj(taxId: string): string {
  const d = taxId.replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/••••-••` : "não informado";
}

async function Conteudo() {
  const r = await loadPanelSafe("perfil");
  if (!r.ok) {
    return (
      <p role="alert" className="t-body rounded-card bg-card p-5">
        {r.reason === "no_profile"
          ? "Perfil de demonstração não encontrado. Rode npm run seed."
          : "Não foi possível carregar o perfil. Tente de novo em instantes."}
      </p>
    );
  }

  const { profile, dashboard, today } = r.panel;
  const year = yearOf(today);
  const cfg = rulesFor(year);
  const openYear = yearOf(profile.openingDate);
  const openMonth = monthOf(profile.openingDate) - 1;
  const activeMonths = openYear === year ? 12 - openMonth : 12;
  const initials = profile.name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <>
      <section className="flex items-center gap-4 rounded-card bg-card p-5">
        <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full bg-primary text-[1.5rem] font-extrabold text-on-primary">
          {initials || "T"}
        </span>
        <div className="min-w-0">
          <h2 className="t-title truncate">{profile.name}</h2>
          <p className="t-sub text-label-2">CNPJ {maskCnpj(profile.taxId)}</p>
          <p className="t-sub text-label-2">
            MEI desde {monthName(openMonth)} de {openYear}
          </p>
        </div>
      </section>
      <Link href="/perfil/editar" className="mt-3 flex h-12 items-center justify-center rounded-full bg-card text-[1.0625rem] font-semibold">
        Editar cadastro
      </Link>

      <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Aparência</h2>
      <div className="divide-y divide-sep rounded-card bg-card">
        <div className="px-5 py-3.5">
          <p className="t-row mb-2.5">Tema</p>
          <ThemeControl />
        </div>
        <PrivacyToggle variant="row" />
      </div>
      <p className="t-sub mt-2 px-5 text-label-2">Estas escolhas ficam só neste aparelho.</p>

      <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Regras de {year}</h2>
      <div className="divide-y divide-sep rounded-card bg-card">
        <Row
          label="Limite do ano"
          value={formatReais(dashboard.limitCents)}
          hint={activeMonths < 12 ? `Proporcional: ${activeMonths} meses de atividade` : "Limite anual completo"}
        />
        <Row label={`Com ${formatPercent(cfg.toleranceRate)} a mais`} value={formatReais(dashboard.toleranceLimitCents)} hint="Acima disso o desenquadramento é retroativo" />
        <Row label="Alerta de atenção" value={formatPercent(cfg.warningRatio)} hint="do limite" />
        <Row label="Alerta crítico" value={formatPercent(cfg.criticalRatio)} hint="do limite" />
        <Row label="Vencimento do DAS" value={`dia ${cfg.dasDueDay}`} />
      </div>
      <p className="t-sub mt-2 px-5 text-label-2">
        Estas regras ficam no código do Teto e valem para {year}. Confirme sempre no Portal do Empreendedor.
      </p>

      <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Sobre</h2>
      <div className="rounded-card bg-card p-5">
        <p className="t-body">Todos os dados desta demonstração são fictícios.</p>
        <p className="t-body mt-2 text-label-2">
          A IA só lê as notas. Quem decide o que entra no limite é o código, e só depois da sua conferência.
        </p>
      </div>
    </>
  );
}
