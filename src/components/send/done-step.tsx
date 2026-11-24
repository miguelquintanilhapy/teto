import { LimitBar } from "@/components/limit-bar";
import { bandView } from "@/lib/copy";
import { formatMoney, formatPercent, formatReais } from "@/lib/format";
import type { Impact, SendContext } from "@/lib/send";
import { BottomAction, primaryButton } from "./sheet-shell";

const TONE_TEXT = { ok: "text-ok-text", warn: "text-warn-text", danger: "text-danger-text" } as const;

/** O telhado da marca com o visto: a confirmação tem a cara do Teto. */
function RoofCheck() {
  return (
    <span className="mx-auto grid size-[6.75rem] place-items-center rounded-full bg-ok text-white">
      <svg width="108" height="108" viewBox="0 0 108 108" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M27,48 L54,28 L81,48" strokeWidth="8" />
        <path d="M37,68 L49.5,80 L72,57" strokeWidth="9" />
      </svg>
    </span>
  );
}

export function DoneStep({
  ctx,
  impact,
  duplicate,
  expense,
  onAnother,
  onBack,
}: {
  ctx: SendContext;
  impact: Impact;
  duplicate: boolean;
  expense: boolean;
  onAnother: () => void;
  onBack: () => void;
}) {
  const { label, tone } = bandView(impact.band);
  const room = Math.max(0, ctx.limitCents - impact.afterCents);

  return (
    <>
      <div className="mt-8 text-center" role="status">
        <RoofCheck />
        <h1 className="t-large-title mt-6">{duplicate ? "Nota já confirmada" : expense ? "Despesa registrada" : "Nota confirmada"}</h1>
        <p className="mt-2.5 text-xl leading-snug text-label-2">
          {duplicate
            ? "Esta nota já estava no seu histórico e não foi somada de novo."
            : expense
              ? "Ela não conta para o limite do MEI."
              : `${formatMoney(impact.addedCents)} somados ao seu faturamento de ${ctx.year}.`}
        </p>
      </div>

      {!expense && (
        <section aria-label="Situação do limite" className="mt-8 rounded-card bg-card p-5">
          <p className={`mb-3 text-[1.0625rem] font-bold ${TONE_TEXT[tone]}`}>
            {label} · {formatPercent(impact.ratio)} do limite
          </p>
          <LimitBar ratio={impact.ratio} tone={tone} label={`Você usou ${formatPercent(impact.ratio)} do limite`} />
          <div className="t-caption mt-2 flex justify-between text-label-2">
            <span>{formatReais(impact.afterCents)}</span>
            <span>Limite de {formatReais(ctx.limitCents)}</span>
          </div>
          <p className="t-body mt-3.5 text-label-2">
            {room > 0 ? `Faltam ${formatReais(room)} para o limite do ano.` : "O limite do ano foi atingido."}
          </p>
        </section>
      )}

      <BottomAction>
        <button type="button" onClick={onBack} className={primaryButton}>
          Voltar ao painel
        </button>
        <button type="button" onClick={onAnother} className="h-11 text-[1.1875rem] font-semibold">
          Enviar outra nota
        </button>
      </BottomAction>
    </>
  );
}
