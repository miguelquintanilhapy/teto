"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { shrinkImage } from "@/lib/image-resize";
import { readLaunchParams } from "@/lib/reconciliation";
import { readConfirmResponse, readUploadResponse } from "@/lib/send-api";
import { impactOf, toConfirmBody, type Impact, type ReviewValues, type SendContext } from "@/lib/send";
import { checkFile, ChooseStep } from "./choose-step";
import { DiscardSheet } from "./discard-sheet";
import { DoneStep } from "./done-step";
import { ReadingStep } from "./reading-step";
import { ReviewStep, type ReviewNotice } from "./review-step";
import { SheetShell } from "./sheet-shell";

type Stage =
  | { name: "choose"; error: string | null }
  | { name: "reading"; fileName: string; previewUrl: string | null }
  | { name: "review"; values: ReviewValues; notice: ReviewNotice; saving: boolean; error: string | null }
  | { name: "done"; impact: Impact; duplicate: boolean; expense: boolean };

const EMPTY: ReviewValues = {
  documentId: null,
  documentType: null,
  amountCents: 0,
  date: "",
  description: "",
  issuerTaxId: null,
  recipientTaxId: null,
  accessKey: null,
  confidence: null,
};

const TITLES: Record<Stage["name"], string | undefined> = {
  choose: "Enviar nota",
  reading: "Enviar nota",
  review: "Conferir nota",
  done: undefined,
};

/**
 * Com o cache de componentes, o Next guarda a tela anterior escondida quando o usuário navega, com o estado
 * dentro. Sem este invólucro, sair de uma nota (no X) e tocar em "Enviar nota" de novo trazia de volta a nota
 * abandonada. Ao sair da tela, o fluxo descarta o estado: a próxima visita recomeça do zero.
 */
export function SendFlow(props: { ctx: SendContext; startManual?: boolean }) {
  const [visit, setVisit] = useState(0);
  useEffect(() => () => setVisit((v) => v + 1), []);
  return <SendFlowSteps key={visit} {...props} />;
}

/** Fluxo em quatro passos: escolher, ler, conferir e confirmar. Só o código decide o que entra no limite. */
function SendFlowSteps({ ctx: initialCtx, startManual = false }: { ctx: SendContext; startManual?: boolean }) {
  const router = useRouter();
  const [ctx, setCtx] = useState(initialCtx);
  const params = useSearchParams();
  const prefill = startManual ? readLaunchParams((k) => params.get(k), initialCtx.today) : null;
  const first = (): Stage =>
    startManual
      ? { name: "review", values: prefill ? { ...EMPTY, amountCents: prefill.amountCents, date: prefill.date || initialCtx.today, description: prefill.description } : { ...EMPTY, date: initialCtx.today }, notice: { duplicate: false, lowTrust: false, manual: true, chosen: true }, saving: false, error: null }
      : { name: "choose", error: null };
  const [stage, setStage] = useState<Stage>(first);
  const abortRef = useRef<AbortController | null>(null);

  // Sair da conferência com dados lidos ou digitados pede confirmação; nas outras etapas, fecha direto.
  const [dirty, setDirty] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const onDirtyChange = useCallback((d: boolean) => setDirty(d), []);

  // O foco acompanha a etapa: sem isso, o botão tocado some e o leitor de tela fica sem saber o que mudou.
  const stepRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    stepRef.current?.focus({ preventScroll: true });
  }, [stage.name]);

  async function handleFile(original: File) {
    const controller = new AbortController();
    abortRef.current = controller;
    // A miniatura da foto aparece enquanto a IA lê; PDF não tem miniatura.
    const previewUrl = original.type.startsWith("image/") ? URL.createObjectURL(original) : null;
    setStage({ name: "reading", fileName: original.name, previewUrl });

    // Foto grande é reduzida aqui, no aparelho: quem fotografa não precisa saber de megabytes.
    const file = await shrinkImage(original);
    if (controller.signal.aborted) return; // cancelou enquanto a foto era preparada
    const problem = checkFile(file);
    if (problem) return setStage({ name: "choose", error: problem });

    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", "nota");
      const res = await fetch("/api/documents", { method: "POST", body: form, signal: controller.signal });
      const body: unknown = await res.json().catch(() => null);
      const out = readUploadResponse(res.status, body);

      if (out.kind === "error") return setStage({ name: "choose", error: out.message });
      if (out.kind === "manual") {
        return setStage({
          name: "review",
          values: { ...EMPTY, documentId: out.documentId },
          notice: { duplicate: false, lowTrust: false, manual: true },
          saving: false,
          error: null,
        });
      }
      setStage({
        name: "review",
        values: out.values,
        notice: { duplicate: out.duplicate, lowTrust: out.lowTrust, keyDropped: out.keyDropped, manual: false },
        saving: false,
        error: null,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // quem cancelou já escolheu a próxima tela
      setStage({ name: "choose", error: "Sem conexão com o servidor. Confira a internet e tente de novo." });
    }
  }

  function cancelReading() {
    abortRef.current?.abort();
    setStage({ name: "choose", error: null });
  }

  /** O usuário não quis esperar a IA: abre o formulário em branco. */
  function skipToManual() {
    abortRef.current?.abort();
    setStage({
      name: "review",
      values: EMPTY,
      notice: { duplicate: false, lowTrust: false, manual: true },
      saving: false,
      error: null,
    });
  }

  async function confirm(values: ReviewValues, notice: ReviewNotice, kind: "receita" | "despesa", explicit: boolean) {
    setStage({ name: "review", values, notice, saving: true, error: null });
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toConfirmBody(values, explicit ? kind : undefined)),
      });
      const out = readConfirmResponse(res.status, await res.json().catch(() => null));
      if (out.kind === "error") return setStage({ name: "review", values, notice, saving: false, error: out.message });

      // Mesma regra do servidor (pelo núcleo): na confirmação nova, só receita soma.
      const direction = kind;
      const duplicate = out.kind === "duplicate";
      const impact = impactOf(ctx, values.amountCents, direction);
      if (!duplicate && impact.addedCents > 0) setCtx((c) => ({ ...c, accumulatedCents: impact.afterCents }));
      setStage({
        name: "done",
        impact: duplicate ? impactOf(ctx, values.amountCents, "indefinida") : impact,
        duplicate,
        expense: direction === "despesa",
      });
    } catch {
      setStage({ name: "review", values, notice, saving: false, error: "Sem conexão com o servidor. Confira a internet e tente de novo." });
    }
  }

  const backToPanel = () => {
    router.push("/");
    router.refresh();
  };

  return (
    <SheetShell
      title={startManual && stage.name === "review" ? "Lançar sem nota" : TITLES[stage.name]}
      onClose={stage.name === "review" && !stage.saving && dirty ? () => setConfirmingClose(true) : undefined}
    >
      <div ref={stepRef} tabIndex={-1} role="group" aria-label={TITLES[stage.name] ?? "Nota confirmada"} className="outline-none">
      {stage.name === "choose" && <ChooseStep onFile={handleFile} error={stage.error} />}
      {stage.name === "reading" && <ReadingStep fileName={stage.fileName} previewUrl={stage.previewUrl} onCancel={cancelReading} onManual={skipToManual} />}
      {stage.name === "review" && (
        <ReviewStep
          ctx={ctx}
          initial={stage.values}
          notice={stage.notice}
          saving={stage.saving}
          error={stage.error}
          onConfirm={(v, kind, explicit) => confirm(v, stage.notice, kind, explicit)}
          onDirtyChange={onDirtyChange}
        />
      )}
      {stage.name === "done" && (
        <DoneStep
          ctx={ctx}
          impact={stage.impact}
          duplicate={stage.duplicate}
          expense={stage.expense}
          onAnother={() => setStage(first())}
          onBack={backToPanel}
          anotherLabel={startManual ? "Lançar outro" : "Enviar outra nota"}
        />
      )}
      </div>
      {confirmingClose && <DiscardSheet onKeep={() => setConfirmingClose(false)} onDiscard={() => router.push("/")} />}
    </SheetShell>
  );
}
