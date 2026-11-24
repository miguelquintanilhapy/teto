"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CurrencyField, TextField } from "@/components/send/currency-field";
import { formatMoney } from "@/lib/format";
import { reviewErrors } from "@/lib/send";

interface Editable {
  id: string;
  amountCents: number;
  date: string;
  description: string;
  counts: boolean;
}

type Mode = "idle" | "editing" | "confirming-cancel";

async function patch(id: string, body: Record<string, unknown>): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const data: unknown = await res.json().catch(() => null);
    const message = typeof data === "object" && data !== null && "message" in data && typeof data.message === "string" ? data.message : null;
    return { ok: false, message: message ?? "Não foi possível salvar agora. Tente de novo." };
  } catch {
    return { ok: false, message: "Sem conexão com o servidor. Confira a internet e tente de novo." };
  }
}

const secondary = "flex h-[3.375rem] w-full items-center justify-center rounded-full bg-card text-[1.1875rem] font-semibold";

/** Corrigir e cancelar. Cancelar pede confirmação e diz o que muda no limite. */
export function TransactionActions({ t, today }: { t: Editable; today: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [amount, setAmount] = useState(t.amountCents);
  const [date, setDate] = useState(t.date);
  const [description, setDescription] = useState(t.description);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = attempted ? reviewErrors({ amountCents: amount, date }, today) : {};

  async function run(body: Record<string, unknown>, after: () => void) {
    setSaving(true);
    setError(null);
    const r = await patch(t.id, body);
    setSaving(false);
    if (!r.ok) return setError(r.message);
    router.refresh();
    after();
  }

  function save() {
    setAttempted(true);
    if (Object.keys(reviewErrors({ amountCents: amount, date }, today)).length > 0) return;
    void run({ action: "correct", amountCents: amount, date, description }, () => setMode("idle"));
  }

  if (mode === "editing") {
    return (
      <section aria-label="Corrigir lançamento" className="mt-6">
        <h2 className="mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">Corrigir</h2>
        <div className="divide-y divide-sep rounded-card bg-card">
          <CurrencyField label="Valor" cents={amount} onChange={setAmount} error={errors.amount} />
          <TextField label="Data" type="date" value={date} max={today} onChange={setDate} error={errors.date} />
          <TextField label="Descrição" value={description} onChange={setDescription} maxLength={300} />
        </div>
        <p className="t-sub mt-2 px-5 text-label-2">O tipo e as partes da nota não mudam. A correção fica registrada no histórico.</p>
        {error && (
          <p role="alert" className="t-body mt-3 rounded-card bg-card p-4 text-danger-text">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex h-[3.375rem] w-full items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary disabled:opacity-40"
          >
            {saving ? "Salvando…" : "Salvar correção"}
          </button>
          <button type="button" onClick={() => setMode("idle")} disabled={saving} className={secondary}>
            Cancelar
          </button>
        </div>
      </section>
    );
  }

  if (mode === "confirming-cancel") {
    return (
      <section role="alertdialog" aria-labelledby="cancel-title" className="mt-6 rounded-card bg-card p-5">
        <h2 id="cancel-title" className="t-title">
          Cancelar este lançamento?
        </h2>
        <p className="t-body mt-2 text-label-2">
          {t.counts
            ? `${formatMoney(t.amountCents)} deixam de contar no limite do ano. O lançamento continua no histórico, marcado como cancelado.`
            : "O lançamento continua no histórico, marcado como cancelado."}
        </p>
        {error && (
          <p role="alert" className="t-body mt-3 text-danger-text">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void run({ action: "cancel" }, () => router.push("/historico"))}
            disabled={saving}
            className="flex h-[3.375rem] w-full items-center justify-center rounded-full bg-danger text-[1.1875rem] font-bold text-white disabled:opacity-40"
          >
            {saving ? "Cancelando…" : "Cancelar lançamento"}
          </button>
          <button type="button" onClick={() => setMode("idle")} disabled={saving} className={secondary}>
            Voltar
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <button type="button" onClick={() => setMode("editing")} className={secondary}>
        Corrigir valor, data ou descrição
      </button>
      <button
        type="button"
        onClick={() => setMode("confirming-cancel")}
        className="flex h-[3.375rem] w-full items-center justify-center rounded-full text-[1.1875rem] font-semibold text-danger-text"
      >
        Cancelar lançamento
      </button>
    </div>
  );
}
