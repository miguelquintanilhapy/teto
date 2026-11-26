import Link from "next/link";
import { Suspense } from "react";
import { ArrowSquareOut, CaretRight, CheckCircle, Coins, MapPin, Warning, WarningOctagon } from "@phosphor-icons/react/dist/ssr";
import { NoProfile } from "@/components/no-profile";
import { SheetShell } from "@/components/send/sheet-shell";
import type { Tone } from "@/lib/copy";
import { formatReais } from "@/lib/format";
import { PGMEI_URL } from "@/lib/links";
import { rulesGuide } from "@/lib/rules-guide";
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

const TONE_ICON: Record<Tone, typeof CheckCircle> = { ok: CheckCircle, warn: Warning, alert: Warning, danger: WarningOctagon };
const TONE_TEXT: Record<Tone, string> = { ok: "text-ok-text", warn: "text-warn-text", alert: "text-alert-text", danger: "text-danger-text" };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-7 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">{children}</h2>;
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
  const { profile, dashboard } = r.panel;
  const g = rulesGuide(dashboard, profile.openingDate);
  const hasEmail = profile.email.trim() !== "";

  return (
    <>
      {/* A regra que mais confunde vem primeiro: o limite é de faturamento, não de lucro. */}
      <section className="rounded-card bg-card p-5">
        <span className="grid size-11 place-items-center rounded-xl bg-tile">
          <Coins size={24} weight="fill" aria-hidden="true" />
        </span>
        <h2 className="t-title mt-3">Conta tudo que entra, não o lucro</h2>
        <p className="t-body mt-1.5 text-label-2">
          O limite olha o faturamento: a soma de tudo que você vendeu no ano, antes de tirar os custos. Gastos com material, aluguel ou fornecedor não
          diminuem essa conta.
        </p>
      </section>

      <SectionTitle>Seu limite em {g.year}</SectionTitle>
      <section className="rounded-card bg-card p-5">
        <p className="t-display text-[2.25rem]">{formatReais(dashboard.limitCents)}</p>
        <p className="t-body mt-1 text-label-2">{g.limitMath}</p>
      </section>

      <SectionTitle>O que acontece em cada faixa</SectionTitle>
      <ol className="divide-y divide-sep rounded-card bg-card">
        {g.ladder.map((s) => {
          const Icon = TONE_ICON[s.tone];
          return (
            <li key={s.range} className="flex gap-3.5 px-5 py-4">
              <Icon size={24} weight="fill" className={`mt-0.5 shrink-0 ${TONE_TEXT[s.tone]}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="t-row font-semibold">{s.range}</p>
                <p className={`text-[0.9375rem] font-semibold ${TONE_TEXT[s.tone]}`}>{s.title}</p>
                {s.current && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-tile px-2.5 py-1 text-[0.875rem] font-semibold">
                    <MapPin size={15} weight="fill" aria-hidden="true" />
                    Você está aqui: <span className="sensitive">{formatReais(dashboard.accumulatedCents)}</span>
                  </p>
                )}
                <ul className="mt-2 flex flex-col gap-1.5">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-2 text-[0.9375rem] leading-[1.4] text-label-2">
                      <span aria-hidden="true" className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-label-2" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      <SectionTitle>O Teto avisa antes</SectionTitle>
      <div className="divide-y divide-sep rounded-card bg-card">
        {g.warnings.map((w) => (
          <div key={w.when} className="px-5 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="t-row">{w.when}</p>
              <p className="shrink-0 text-[1.0625rem] font-semibold">{w.value}</p>
            </div>
            <p className="t-sub mt-0.5 text-label-2">{w.text}</p>
          </div>
        ))}
      </div>
      <p className="t-sub mt-2 px-5 text-label-2">
        {hasEmail ? (
          "Os avisos aparecem no Painel e chegam por e-mail, uma vez por faixa."
        ) : (
          <>
            Os avisos aparecem no Painel. Para receber também por e-mail,{" "}
            <Link href="/alertas" className="font-semibold text-action">
              veja Avisos do limite
            </Link>
            .
          </>
        )}
      </p>

      <SectionTitle>Todo mês: o DAS</SectionTitle>
      <section className="rounded-card bg-card p-5">
        <p className="t-row font-semibold">Vence no dia {g.dasDueDay}</p>
        <p className="t-body mt-1 text-label-2">
          É a guia mensal do MEI, de valor fixo. A que vence no dia {g.dasDueDay} paga o mês anterior: a de dezembro, por exemplo, paga novembro.
        </p>
        <a
          href={PGMEI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable -mx-1 mt-1 inline-flex min-h-11 items-center gap-1 px-1 text-[1.0625rem] font-semibold text-action"
        >
          Gerar a guia
          <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
          <span className="sr-only">(abre o portal do Simples Nacional)</span>
        </a>
      </section>

      <SectionTitle>Se for passar do limite</SectionTitle>
      <section className="rounded-card bg-card p-5">
        <p className="t-body">
          Fale com um contador <strong className="font-semibold">antes</strong> de emitir a nota que passa do limite. Às vezes dá para deixar uma venda
          para janeiro, quando a conta recomeça.
        </p>
        <Link
          href="/simular"
          className="pressable hoverable -mx-2 mt-3 flex min-h-12 items-center justify-between rounded-xl border-t border-sep px-2 pt-2 text-[1.0625rem] font-semibold text-action"
        >
          Simular uma venda
          <CaretRight size={17} weight="bold" aria-hidden="true" />
        </Link>
      </section>

      <p className="t-sub mt-4 px-5 text-label-2">
        Regras do MEI para {g.year} (Lei Complementar 123/2006). O Teto ajuda a acompanhar, mas não substitui um contador: confirme sempre no Portal do
        Empreendedor.
      </p>
    </>
  );
}
