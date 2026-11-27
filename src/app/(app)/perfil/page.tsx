import Link from "next/link";
import { Suspense } from "react";
import { Bell, DeviceMobile, FileArrowDown, ListChecks, Palette, PencilSimple, Scales, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { NoProfile } from "@/components/no-profile";
import { monthOf, rulesFor, yearOf } from "@/core";
import { PrivacyToggle } from "@/components/prefs/privacy-toggle";
import { ThemeControl } from "@/components/prefs/theme-control";
import { SettingsGroup, SettingsLink, SettingsTile } from "@/components/settings";
import { formatPercent, formatReais, monthName } from "@/lib/format";
import { getEnv } from "@/server/env";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Mais · Teto" };

/** Aba "Mais": o MEI, as preferências e o que não cabe nas outras abas. */
export default function MaisPage() {
  return (
    // No computador (lg), duas colunas: o MEI e os atalhos do MEI à esquerda; preferências, ajuda e sobre à direita.
    <main className="lg:grid lg:grid-cols-2 lg:gap-6">
      <h1 className="t-large-title mt-2 mb-4 lg:col-span-2 lg:mb-0">Mais</h1>
      <Suspense fallback={<div aria-busy="true" className="h-40 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Conteudo />
      </Suspense>
    </main>
  );
}

function maskCnpj(taxId: string): string {
  const d = taxId.replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/••••-••` : "não informado";
}

async function Conteudo() {
  const r = await loadPanelSafe("perfil");
  if (!r.ok) {
    return r.reason === "no_profile" ? (
      <NoProfile />
    ) : (
      <p role="alert" className="t-body rounded-card bg-card p-5">
        Não foi possível carregar o perfil. Tente de novo em instantes.
      </p>
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
      <section className="rounded-card bg-card p-5 lg:col-start-1 lg:row-start-2">
        <div className="flex items-start gap-3.5">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-label text-[1.125rem] font-extrabold text-bg">
            {initials || "T"}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-[1.25rem] leading-tight font-bold">{profile.name}</h2>
            <p className="t-sub mt-0.5 whitespace-nowrap text-label-2">CNPJ {maskCnpj(profile.taxId)}</p>
            <p className="t-sub text-label-2">
              MEI desde {monthName(openMonth)} de {openYear}
            </p>
          </div>
          {getEnv().allowProfileEdit && (
            <Link
              href="/perfil/editar"
              aria-label="Editar perfil"
              className="pressable hoverable -mt-1.5 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-action"
            >
              <PencilSimple size={20} weight="bold" aria-hidden="true" />
            </Link>
          )}
        </div>
        <p className="t-caption mt-4 inline-block rounded-full bg-tile px-3 py-2 font-semibold text-label-2">Demonstração · dados fictícios</p>
      </section>

      <SettingsGroup title="Preferências" note="Estas escolhas ficam só neste aparelho." className="lg:col-start-2 lg:row-start-2 lg:mt-0">
        <div className="px-5 py-3.5">
          <p className="mb-2.5 flex items-center gap-3.5">
            <SettingsTile icon={Palette} />
            <span className="text-[1.0625rem] font-medium">Tema</span>
          </p>
          <ThemeControl />
        </div>
        <PrivacyToggle variant="row" />
      </SettingsGroup>

      <SettingsGroup title="Seu MEI" className="lg:col-start-1 lg:row-span-2 lg:row-start-3 lg:mt-0 lg:self-start">
        <SettingsLink href="/alertas" icon={Bell} title="Avisos do limite" hint="E-mail ao cruzar cada faixa do limite" />
        <SettingsLink href="/relatorio" icon={FileArrowDown} title="Relatório e exportação" hint="Receita mês a mês, em CSV ou PDF" />
        <SettingsLink
          href="/regras"
          icon={Scales}
          title={`Regras de ${year}`}
          hint={`Limite ${formatReais(dashboard.limitCents)} · avisos aos ${formatPercent(cfg.warningRatio)} e ${formatPercent(cfg.criticalRatio)}`}
        />
      </SettingsGroup>

      <SettingsGroup title="Ajuda" className="lg:col-start-2 lg:row-start-3 lg:mt-0 lg:self-start">
        <SettingsLink href="/instalar" icon={DeviceMobile} title="Instalar no celular" hint="Abre como app, sem a barra do navegador" />
        <SettingsLink href="/primeiros-passos" icon={ListChecks} title="Primeiros passos" hint="Três passos para começar" />
      </SettingsGroup>

      <SettingsGroup title="Sobre" className="lg:col-start-2 lg:row-start-4 lg:mt-0 lg:self-start">
        <SettingsLink href="/ia" icon={Sparkle} title="Como a IA lê suas notas" hint="O que a IA faz e o que fica com você" />
      </SettingsGroup>

      <p className="t-sub mt-6 px-5 text-label-2 lg:col-span-2 lg:mt-0">
        A IA só lê as notas. Quem decide o que entra no limite é o código, e só depois da sua conferência.
      </p>
      {/* A versão é útil para suporte, mas não precisa ficar na cara de quem usa: aparece com um toque. */}
      <details className="mt-3 px-5 pb-2 text-center lg:col-span-2 lg:mt-0">
        <summary className="t-caption mx-auto inline-flex min-h-11 cursor-pointer list-none items-center px-3 text-label-2 [&::-webkit-details-marker]:hidden">
          Teto
        </summary>
        <p className="t-caption text-label-2">versão {build}</p>
      </details>
    </>
  );
}
