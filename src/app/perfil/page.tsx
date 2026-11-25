import Link from "next/link";
import { Suspense } from "react";
import { Bell, DeviceMobile, FileArrowDown, ListChecks, Palette, PencilSimple, Scales, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { NoProfile } from "@/components/no-profile";
import { monthOf, rulesFor, yearOf } from "@/core";
import { PrivacyToggle } from "@/components/prefs/privacy-toggle";
import { ThemeControl } from "@/components/prefs/theme-control";
import { SheetShell } from "@/components/send/sheet-shell";
import { SettingsGroup, SettingsLink, SettingsTile } from "@/components/settings";
import { formatPercent, formatReais, monthName } from "@/lib/format";
import { getEnv } from "@/server/env";
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

function maskCnpj(taxId: string): string {
  const d = taxId.replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/••••-••` : "não informado";
}

async function Conteudo() {
  const r = await loadPanelSafe("perfil");
  if (!r.ok) {
    return (
      <>
        {r.reason === "no_profile" ? (
          <NoProfile />
        ) : (
          <p role="alert" className="t-body rounded-card bg-card p-5">
            Não foi possível carregar o perfil. Tente de novo em instantes.
          </p>
        )}
      </>
    );
  }

  const { profile, dashboard, today } = r.panel;
  const year = yearOf(today);
  const cfg = rulesFor(year);
  const openYear = yearOf(profile.openingDate);
  const openMonth = monthOf(profile.openingDate) - 1;
  const initials = profile.name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const build = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

  return (
    <>
      <section className="rounded-card bg-card p-5">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full bg-primary text-[1.5rem] font-extrabold text-on-primary">
            {initials || "T"}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="t-title truncate">{profile.name}</h2>
            <p className="t-sub text-label-2">CNPJ {maskCnpj(profile.taxId)}</p>
            <p className="t-sub text-label-2">
              MEI desde {monthName(openMonth)} de {openYear}
            </p>
          </div>
          {getEnv().allowProfileEdit && (
            <Link
              href="/perfil/editar"
              aria-label="Editar perfil"
              className="pressable hoverable -mr-2 grid size-11 shrink-0 place-items-center self-start rounded-full text-label-2"
            >
              <PencilSimple size={20} weight="bold" aria-hidden="true" />
            </Link>
          )}
        </div>
        <p className="t-caption mt-4 inline-block rounded-full bg-tile px-3 py-2 font-semibold text-label-2">Demonstração · dados fictícios</p>
      </section>

      <SettingsGroup title="Preferências" note="Estas escolhas ficam só neste aparelho.">
        <div className="px-5 py-3.5">
          <p className="mb-2.5 flex items-center gap-3.5">
            <SettingsTile icon={Palette} />
            <span className="t-row">Tema</span>
          </p>
          <ThemeControl />
        </div>
        <PrivacyToggle variant="row" />
      </SettingsGroup>

      <SettingsGroup title="Seu MEI">
        <SettingsLink href="/alertas" icon={Bell} title="Alertas por e-mail" hint="Avisos ao cruzar cada faixa do limite" />
        <SettingsLink href="/relatorio" icon={FileArrowDown} title="Relatório e exportação" hint="Receita mês a mês, em CSV ou PDF" />
        <SettingsLink
          href="/regras"
          icon={Scales}
          title={`Regras de ${year}`}
          hint={`Limite ${formatReais(dashboard.limitCents)} · alertas em ${formatPercent(cfg.warningRatio)} e ${formatPercent(cfg.criticalRatio)}`}
        />
      </SettingsGroup>

      <SettingsGroup title="Ajuda">
        <SettingsLink href="/ia" icon={Sparkle} title="Como a IA lê suas notas" hint="Modelos, tempos, falhas e a cota de hoje" />
        <SettingsLink href="/instalar" icon={DeviceMobile} title="Instalar no celular" hint="Abre como app, sem a barra do navegador" />
        <SettingsLink href="/primeiros-passos" icon={ListChecks} title="Ver primeiros passos" hint="Três passos para começar" />
      </SettingsGroup>

      <p className="t-sub mt-6 px-5 text-label-2">
        A IA só lê as notas. Quem decide o que entra no limite é o código, e só depois da sua conferência.
      </p>
      <p className="t-caption mt-3 px-5 pb-2 text-center text-label-2">Teto · versão {build}</p>
    </>
  );
}
