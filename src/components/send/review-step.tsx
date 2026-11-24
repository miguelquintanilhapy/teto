"use client";

import { Lock, Sparkle, Warning } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { LimitBar } from "@/components/limit-bar";
import { bandView } from "@/lib/copy";
import { formatMoney, formatPercent, formatReais, maskTaxId } from "@/lib/format";
import { directionOf, impactOf, reviewErrors, type ReviewValues, type SendContext } from "@/lib/send";
import { CurrencyField, TextField } from "./currency-field";
import { BottomAction, primaryButton } from "./sheet-shell";

const TONE_TEXT = { ok: "text-ok-text", warn: "text-warn-text", danger: "text-danger-text" } as const;

export interface ReviewNotice {
  /** Arquivo já enviado antes. */
  duplicate: boolean;
  /** A IA teve dúvida ou a validação achou problemas. */
  lowTrust: boolean;
  /** Não foi possível ler a nota: o usuário preenche tudo. */
  manual: boolean;
}

export function ReviewStep({
  ctx,
  initial,
  notice,
  saving,
  error,
  onConfirm,
}: {
  ctx: SendContext;
  initial: ReviewValues;
  notice: ReviewNotice;
  saving: boolean;
  error: string | null;
  onConfirm: (values: ReviewValues) => void;
}) {
  const [values, setValues] = useState(initial);
  const [attempted, setAttempted] = useState(false);

  const set = <K extends keyof ReviewValues>(key: K, v: ReviewValues[K]) => setValues((s) => ({ ...s, [key]: v }));

  const manual = notice.manual;
  const direction = manual ? "receita" : directionOf(ctx, values);
  const errors = attempted ? reviewErrors(values, ctx.today) : {};
  const undefinedDirection = direction === "indefinida";
  const impact = impactOf(ctx, values.amountCents, direction);
  const { label, tone } = bandView(impact.band);
  const counterparty = direction === "despesa" ? values.issuerTaxId : values.recipientTaxId;

  const submit = () => {
    setAttempted(true);
    if (Object.keys(reviewErrors(values, ctx.today)).length > 0 || undefinedDirection) return;
    onConfirm(values);
  };

  return (
    <>
      {notice.duplicate && (
        <p role="status" className="t-body mb-3 rounded-card bg-card p-4 text-label-2">
          Você já enviou este arquivo. Se ele já foi confirmado, não será somado de novo.
        </p>
      )}
      {manual && (
        <p role="status" className="t-body mb-3 flex items-start gap-2 rounded-card bg-card p-4">
          <Warning size={20} weight="fill" className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          Não consegui ler esta nota. Preencha os dados abaixo.
        </p>
      )}
      {!manual && (
        <p className="t-sub mb-3 flex items-center gap-1.5 px-1 text-label-2">
          <Sparkle size={14} weight="fill" aria-hidden="true" /> Lida pela IA. Confira antes de confirmar.
        </p>
      )}
      {notice.lowTrust && !manual && (
        <p role="status" className="t-body mb-3 flex items-start gap-2 rounded-card bg-card p-4 text-warn-text">
          <Warning size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          A IA teve dúvida. Confira com atenção o valor e a data.
        </p>
      )}

      <h2 className="mt-5 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Dados da nota</h2>
      <div className="divide-y divide-sep rounded-card bg-card">
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="t-row">Tipo</span>
          <span className={`t-row flex items-center gap-2 ${undefinedDirection ? "text-warn-text" : "text-label-2"}`}>
            {direction === "receita" ? "Receita" : direction === "despesa" ? "Despesa" : "Não identificado"}
            <Lock size={15} weight="fill" aria-hidden="true" />
          </span>
        </div>
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
        {undefinedDirection
          ? "Não encontrei o CNPJ do seu MEI na nota, então não sei se é receita ou despesa. Ela não será somada."
          : direction === "despesa"
            ? "Você é quem recebeu a nota, então é uma despesa. Despesa não conta para o limite."
            : "Você é quem emitiu a nota, então ela é uma receita."}
      </p>

      {direction === "receita" && (
        <>
          <h2 className="mt-6 mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Depois de confirmar</h2>
          <section aria-label="Efeito no limite" className="rounded-card bg-card p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="text-[1.875rem] leading-none font-extrabold tracking-tight">{formatReais(impact.afterCents)}</p>
              <p className={`text-[1.0625rem] font-bold ${TONE_TEXT[tone]}`}>
                {label} · {formatPercent(impact.ratio)}
              </p>
            </div>
            <LimitBar
              ratio={impact.ratio}
              addedRatio={ctx.limitCents > 0 ? impact.addedCents / ctx.limitCents : 0}
              tone={tone}
              label={`Com esta nota você usa ${formatPercent(impact.ratio)} do limite`}
            />
            <div className="t-caption mt-2 flex justify-between text-label-2">
              <span>{impact.addedCents > 0 ? `+ ${formatMoney(impact.addedCents)} desta nota` : "R$ 0"}</span>
              <span>Limite de {formatReais(ctx.limitCents)}</span>
            </div>
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
        <button type="button" onClick={submit} disabled={saving || undefinedDirection} className={primaryButton}>
          {saving ? "Salvando…" : "Confirmar nota"}
        </button>
      </BottomAction>
    </>
  );
}
