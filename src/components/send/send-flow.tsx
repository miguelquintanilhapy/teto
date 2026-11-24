"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { readConfirmResponse, readUploadResponse } from "@/lib/send-api";
import { impactOf, toConfirmBody, type Impact, type ReviewValues, type SendContext } from "@/lib/send";
import { checkFile, ChooseStep } from "./choose-step";
import { DoneStep } from "./done-step";
import { ReadingStep } from "./reading-step";
import { ReviewStep, type ReviewNotice } from "./review-step";
import { SheetShell } from "./sheet-shell";

type Stage =
  | { name: "choose"; error: string | null }
  | { name: "reading"; fileName: string }
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

/** Fluxo em quatro passos: escolher, ler, conferir e confirmar. Só o código decide o que entra no limite. */
export function SendFlow({ ctx: initialCtx }: { ctx: SendContext }) {
  const router = useRouter();
  const [ctx, setCtx] = useState(initialCtx);
  const [stage, setStage] = useState<Stage>({ name: "choose", error: null });
  const abortRef = useRef<AbortController | null>(null);

  async function handleFile(file: File) {
    const problem = checkFile(file);
    if (problem) return setStage({ name: "choose", error: problem });

    const controller = new AbortController();
    abortRef.current = controller;
    setStage({ name: "reading", fileName: file.name });

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
        notice: { duplicate: out.duplicate, lowTrust: out.lowTrust, manual: false },
        saving: false,
        error: null,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return setStage({ name: "choose", error: null });
      setStage({ name: "choose", error: "Sem conexão com o servidor. Confira a internet e tente de novo." });
    }
  }

  function cancelReading() {
    abortRef.current?.abort();
    setStage({ name: "choose", error: null });
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
    <SheetShell title={TITLES[stage.name]}>
      {stage.name === "choose" && <ChooseStep onFile={handleFile} error={stage.error} />}
      {stage.name === "reading" && <ReadingStep fileName={stage.fileName} onCancel={cancelReading} />}
      {stage.name === "review" && (
        <ReviewStep
          ctx={ctx}
          initial={stage.values}
          notice={stage.notice}
          saving={stage.saving}
          error={stage.error}
          onConfirm={(v, kind, explicit) => confirm(v, stage.notice, kind, explicit)}
        />
      )}
      {stage.name === "done" && (
        <DoneStep
          ctx={ctx}
          impact={stage.impact}
          duplicate={stage.duplicate}
          expense={stage.expense}
          onAnother={() => setStage({ name: "choose", error: null })}
          onBack={backToPanel}
        />
      )}
    </SheetShell>
  );
}
