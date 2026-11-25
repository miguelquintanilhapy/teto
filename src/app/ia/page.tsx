import { Suspense } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { LimitBar } from "@/components/limit-bar";
import { SheetShell } from "@/components/send/sheet-shell";
import { formatPercent } from "@/lib/format";
import { getAiInsights } from "@/server/ai/load";
import { errorLabel, splitProvider, type ExtractionLog } from "@/server/ai/insights";

export const metadata = { title: "Como a IA lê · Teto" };

export default function IaPage() {
  return (
    <SheetShell title="Como a IA lê" closeHref="/perfil">
      <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Conteudo />
      </Suspense>
    </SheetShell>
  );
}

const seconds = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1).replace(".", ",")} s`);

const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const dayTime = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-card p-4">
      <p className="t-sub text-label-2">{label}</p>
      <p className="mt-1 text-[1.625rem] leading-none font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

const STATUS: Record<ExtractionLog["status"], { label: string; cls: string }> = {
  accepted: { label: "Aceita", cls: "text-ok-text" },
  needs_review: { label: "Pediu conferência", cls: "text-warn-text" },
  failed: { label: "Falhou", cls: "text-danger-text" },
};

function trail(log: ExtractionLog): string {
  const steps = log.attempts
    .filter((a) => !a.outcome.startsWith("skipped"))
    .map((a) => {
      const name = splitProvider(a.providerId).provider;
      if (a.outcome === "accepted") return `${name} leu em ${seconds(a.latencyMs)}`;
      if (a.outcome === "rejected") return `${name} respondeu, mas reprovou na validação`;
      if (a.outcome === "cancelled") return `${name} foi dispensado (outro respondeu antes)`;
      return `${name}: ${errorLabel(a.errorKind ?? "unknown")}`;
    });
  const skipped = log.attempts.filter((a) => a.outcome.startsWith("skipped")).length;
  const base = steps.length > 0 ? steps.join(" → ") : "Nenhum modelo respondeu";
  return skipped > 0 ? `${base} (${skipped} em pausa)` : base;
}

async function Conteudo() {
  let data;
  try {
    data = await getAiInsights();
  } catch (e) {
    console.error("ia: falha ao carregar", e instanceof Error ? e.message.slice(0, 200) : "erro desconhecido");
    return (
      <p role="alert" className="t-body rounded-card bg-card p-5">
        Não foi possível carregar agora. Tente de novo em instantes.
      </p>
    );
  }
  if (!data) {
    return <p className="t-body rounded-card bg-card p-5">Cadastre o MEI para ver como a IA lê as suas notas.</p>;
  }

  const { summary, chain, cooldowns, quota, recent } = data;
  const quotaRatio = quota.limit > 0 ? quota.used / quota.limit : 0;
  const quotaTone = quotaRatio >= 0.9 ? "danger" : quotaRatio >= 0.7 ? "warn" : "ok";
  const paused = new Map(cooldowns.map((c) => [c.providerId, c]));
  const stats = new Map(summary.providers.map((p) => [p.providerId, p]));

  return (
    <>
      <section className="rounded-card bg-card p-5">
        <h2 className="t-title">A IA só lê a nota. Quem confirma é você.</h2>
        <p className="t-body mt-2 text-label-2">
          A IA copia da nota o valor, a data e quem vendeu e quem comprou. O Teto confere esses dados (CNPJ, data, valor) e decide se é receita ou despesa pelo CNPJ do seu MEI. Nada entra no limite antes de você conferir e confirmar.
        </p>
      </section>

      <section aria-label="Resumo das leituras" className="mt-3 rounded-card bg-card p-5">
        <h2 className="t-headline">E se a IA errar?</h2>
        <p className="t-body mt-1 text-label-2">
          Quando ela tem dúvida, a tela de conferência avisa e pede atenção. Se uma IA falha, outra assume; se todas falham, você preenche à mão, sem perder a nota.
        </p>
      </section>

      <details className="group mt-6">
        <summary className="pressable flex min-h-12 cursor-pointer list-none items-center justify-between rounded-card bg-card px-5 py-3 text-[1.0625rem] font-semibold [&::-webkit-details-marker]:hidden">
          Detalhes técnicos
          <CaretDown size={17} weight="bold" className="text-label-2 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
      <section aria-label="Resumo das leituras" className="mt-4 rounded-card bg-card p-5">
        <p className="t-body">
          {summary.total === 0
            ? "Ainda não houve leituras."
            : `Nas últimas ${summary.total} leituras, ${summary.acceptRate === null ? "nenhuma" : formatPercent(summary.acceptRate)} passaram direto na conferência automática (as outras pediram atenção), em ${seconds(summary.avgTotalMs)} em média.`}
        </p>
      </section>
      <h2 className="mt-4 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Cota de hoje</h2>
      <section aria-label="Cota diária de leituras" className="rounded-card bg-card p-5">
        <p className="mb-3 text-[1.0625rem] font-semibold">
          {quota.used} de {quota.limit} leituras
        </p>
        <LimitBar ratio={quotaRatio} tone={quotaTone} fill={quotaTone === "ok" ? "bg-label-2" : undefined} label={`${quota.used} de ${quota.limit} leituras usadas hoje`} />
        <p className="t-sub mt-2.5 text-label-2">Ao chegar no limite diário, as notas passam a ser preenchidas à mão, sem derrubar nada.</p>
      </section>

      <h2 className="mt-4 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Últimas {summary.total} leituras</h2>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Aceitas direto" value={summary.acceptRate === null ? "—" : formatPercent(summary.acceptRate)} />
        <Stat label="Tempo médio" value={seconds(summary.avgTotalMs)} />
        <Stat label="Pediram conferência" value={String(summary.needsReview)} />
        <Stat label="Trocaram de modelo" value={String(summary.chainFollowed)} />
      </div>

      <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Modelos, na ordem de tentativa</h2>
      <ol className="divide-y divide-sep rounded-card bg-card">
        {chain.map((id, i) => {
          const { provider, model } = splitProvider(id);
          const s = stats.get(id);
          const pause = paused.get(id);
          const errors = s ? Object.entries(s.errors) : [];
          return (
            <li key={id} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="t-row">
                    {i + 1}. {provider}
                  </p>
                  <p className="t-sub truncate text-label-2">{model}</p>
                </div>
                {pause && (
                  <p className="t-caption shrink-0 rounded-full bg-tile px-2.5 py-1 font-semibold text-warn-text">
                    Em pausa até {time.format(new Date(pause.blockedUntil))}
                  </p>
                )}
              </div>
              <p className="t-sub mt-2 text-label-2">
                {s && s.calls > 0
                  ? `${s.calls} chamadas · ${s.accepted} aceitas${s.avgLatencyMs === null ? "" : ` · média de ${seconds(s.avgLatencyMs)}`}`
                  : "Sem chamadas nas últimas leituras"}
              </p>
              {errors.length > 0 && (
                <p className="t-sub mt-0.5 text-label-2">
                  Falhas: {errors.map(([kind, n]) => `${n}× ${errorLabel(kind)}`).join(", ")}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {recent.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Leituras mais recentes</h2>
          <ul className="divide-y divide-sep rounded-card bg-card">
            {recent.map((log) => (
              <li key={log.id} className="px-5 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={`t-row font-semibold ${STATUS[log.status].cls}`}>{STATUS[log.status].label}</p>
                  <p className="t-sub shrink-0 text-label-2">{dayTime.format(new Date(log.createdAt))}</p>
                </div>
                <p className="t-sub mt-1 text-label-2">{trail(log)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      </details>
      <p className="t-sub mt-4 px-5 text-label-2">As instruções dadas à IA têm versão ({recent[0]?.promptVersion ?? "—"}), e a qualidade é medida em notas de teste antes de cada mudança.</p>
    </>
  );
}
