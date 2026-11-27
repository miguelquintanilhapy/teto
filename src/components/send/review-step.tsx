"use client";

import { Lock, Sparkle, Warning } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";
import { BarKey, LimitBar, TONE_FILL } from "@/components/limit-bar";
import { rulesFor } from "@/core";
import { bandView } from "@/lib/copy";
import { formatMoney, formatPercent, formatReais, maskTaxId } from "@/lib/format";
import { directionOf, impactOf, reviewErrors, type ReviewValues, type SendContext } from "@/lib/send";
import { CurrencyField, TextField } from "./currency-field";
import { BottomAction, primaryButton } from "./sheet-shell";

const TONE_TEXT = { ok: "text-ok-text", warn: "text-warn-text", alert: "text-alert-text", danger: "text-danger-text" } as const;

export interface ReviewNotice {
  /** Arquivo já enviado antes. */
  duplicate: boolean;
  /** A IA teve dúvida ou a validação achou problemas. */
  lowTrust: boolean;
  /** A chave de acesso não passou no dígito verificador e foi ignorada; o resto da nota foi lido. */
  keyDropped?: boolean;
  /** Não foi possível ler a nota: o usuário preenche tudo. */
  manual: boolean;
  /** O usuário escolheu lançar sem nota (nada falhou, então não há aviso). */
  chosen?: boolean;
}

export function ReviewStep({
  ctx,
  initial,
  notice,
  saving,
  error,
  onConfirm,
  onDirtyChange,
}: {
  ctx: SendContext;
  initial: ReviewValues;
  notice: ReviewNotice;
  saving: boolean;
  error: string | null;
  onConfirm: (values: ReviewValues, kind: "receita" | "despesa", explicit: boolean) => void;
  /** Há dados lidos ou digitados que se perderiam ao sair. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [values, setValues] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const [chosen, setChosen] = useState<"receita" | "despesa" | null>(null);

  // Nota lida pela IA sempre vale proteger (reler custa tempo); formulário manual, só se alguém digitou.
  const dirty = !notice.manual || chosen !== null || JSON.stringify(values) !== JSON.stringify(initial);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const set = <K extends keyof ReviewValues>(key: K, v: ReviewValues[K]) => setValues((s) => ({ ...s, [key]: v }));

  const manual = notice.manual;
  // O código decide pelos CPF/CNPJ. Só quando não consegue (manual, Pix, nota sem o CNPJ do MEI) o usuário escolhe.
  const derived = directionOf(ctx, values);
  const mustChoose = derived === "indefinida";
  const direction = mustChoose ? (chosen ?? "indefinida") : derived;
  const errors = attempted ? reviewErrors(values, ctx.today) : {};
  const waitingChoice = direction === "indefinida";
  const impact = impactOf(ctx, values.amountCents, direction);
  const { label, tone } = bandView(impact.band);
  const counterparty = direction === "despesa" ? values.issuerTaxId : values.recipientTaxId;

  const submit = () => {
    setAttempted(true);
    if (Object.keys(reviewErrors(values, ctx.today)).length > 0 || direction === "indefinida") return;
    onConfirm(values, direction, mustChoose);
  };

  return (
    <>
      {notice.duplicate && (
        <p role="status" className="t-body mb-3 rounded-card bg-card p-4 text-label-2">
          Você já enviou este arquivo. Se ele já foi confirmado, não será somado de novo.
        </p>
      )}
      {manual && !notice.chosen && (
        <p role="status" className="t-body mb-3 flex items-start gap-2 rounded-card bg-card p-4">
          <Warning size={20} weight="fill" className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          Não foi possível ler esta nota. Preencha os dados abaixo.
        </p>
      )}
      {!manual && (
        <p className="t-sub mb-3 flex items-center gap-1.5 px-1 text-label-2">
          <Sparkle size={14} weight="fill" aria-hidden="true" /> Lida pela IA. Confira antes de confirmar.
        </p>
      )}
      {notice.keyDropped && !notice.lowTrust && !manual && (
        <p role="status" className="t-body mb-3 flex items-start gap-2 rounded-card bg-card p-4">
          <Warning size={20} weight="fill" className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          A chave de acesso não pôde ser lida e foi ignorada. O resto da nota foi lido: confira os dados.
        </p>
      )}
      {notice.lowTrust && !manual && (
        <p role="status" className="t-body mb-3 flex items-start gap-2 rounded-card bg-card p-4 text-warn-text">
          <Warning size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          A IA teve dúvida. Confira com atenção o valor e a data.
        </p>
      )}

      <h2 className="mt-5 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">{notice.chosen ? "Dados do lançamento" : "Dados da nota"}</h2>
      <div className="divide-y divide-sep rounded-card bg-card">
        {mustChoose ? (
          <div className="px-5 py-3.5">
            <p id="tipo-label" className="t-sub text-label-2">
              Tipo
            </p>
            <div role="group" aria-labelledby="tipo-label" className="mt-2 flex rounded-2xl bg-track p-[3px] text-[1.0625rem] font-semibold">
              {(["receita", "despesa"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={chosen === k}
                  onClick={() => setChosen(k)}
                  className={`flex-1 rounded-[0.8125rem] py-2.5 ${chosen === k ? "bg-raised text-label shadow-sm" : "text-label-2"}`}
                >
                  {k === "receita" ? "Receita" : "Despesa"}
                </button>
              ))}
            </div>
            {attempted && waitingChoice && (
              <p role="alert" className="t-sub mt-1.5 text-danger-text">
                Escolha se é uma receita ou uma despesa.
              </p>
            )}
          </div>
        ) : (
          <div className="px-5 py-3">
            <p className="t-sub text-label-2">Tipo</p>
            <p className="mt-0.5 flex items-center gap-2 text-[1.1875rem] font-medium">
              {derived === "receita" ? "Receita" : "Despesa"}
              <Lock size={15} weight="fill" className="text-label-2" aria-label="definido pelo CNPJ" />
            </p>
          </div>
        )}
        <CurrencyField label="Valor" cents={values.amountCents} onChange={(c) => set("amountCents", c)} error={errors.amount} />
        <TextField label="Data" type="date" value={values.date} max={ctx.today} onChange={(v) => set("date", v)} error={errors.date} />
        {!manual && (
          <div className="px-5 py-3">
            <p className="t-sub text-label-2">{direction === "despesa" ? "Fornecedor" : "Cliente"}</p>
            <p className="mt-0.5 text-[1.1875rem] font-medium">{maskTaxId(counterparty)}</p>
          </div>
        )}
        <TextField label="Descrição" value={values.description} onChange={(v) => set("description", v)} maxLength={300} placeholder="Ex.: bolo de aniversário" />
      </div>
      <p className="t-sub mt-2 px-5 text-label-2">
        {mustChoose
          ? manual
            ? "Escolha se é uma receita ou uma despesa. Só receita conta para o limite."
            : "O CNPJ do seu MEI não aparece na nota. Escolha se é uma receita ou uma despesa. Só receita conta para o limite."
          : direction === "despesa"
            ? "Você é quem recebeu a nota, então é uma despesa. Despesa não conta para o limite."
            : "Você é quem emitiu a nota, então ela é uma receita."}
      </p>

      {direction === "receita" && (
        <>
          <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Depois de confirmar</h2>
          <section aria-label="Efeito no limite" className="rounded-card bg-card p-5">
            <p className="t-sub mb-1 text-label-2">Faturamento do ano com esta nota</p>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="sensitive text-[1.875rem] leading-none font-extrabold tracking-tight">{formatReais(impact.afterCents)}</p>
              <p className={`text-[1.0625rem] font-bold ${TONE_TEXT[tone]}`}>
                {label} · {formatPercent(impact.ratio)}
              </p>
            </div>
            <LimitBar
              ratio={impact.ratio}
              addedRatio={ctx.limitCents > 0 ? impact.addedCents / ctx.limitCents : 0}
              tone={tone}
              label={`Com esta nota você usa ${formatPercent(impact.ratio)} do limite`}
              scaleMax={1 + rulesFor(ctx.year).toleranceRate}
            />
            <div className="t-caption mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-label-2">
              <BarKey className={TONE_FILL[tone]}>Já faturado</BarKey>
              <BarKey className="bg-label">
                <span className="sensitive">{impact.addedCents > 0 ? `+ ${formatMoney(impact.addedCents)} desta nota` : "Esta nota"}</span>
              </BarKey>
              <BarKey mark>Limite {formatReais(ctx.limitCents)}</BarKey>
            </div>
            <p className="t-body sensitive mt-3 text-label-2">
              {ctx.limitCents > impact.afterCents
                ? `Ainda cabem ${formatReais(ctx.limitCents - impact.afterCents)} até o limite do ano.`
                : `Passa do limite em ${formatReais(impact.afterCents - ctx.limitCents)}.`}
            </p>
          </section>
        </>
      )}

      {error && (
        <p role="alert" className="t-body mt-4 flex items-start gap-2 rounded-card bg-card p-4 text-danger-text">
          <Warning size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <BottomAction>
        <button type="button" onClick={submit} disabled={saving} className={primaryButton}>
          {saving ? "Salvando…" : notice.chosen ? "Confirmar lançamento" : "Confirmar nota"}
        </button>
      </BottomAction>
    </>
  );
}
