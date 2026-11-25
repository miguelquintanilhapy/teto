"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TextField } from "@/components/send/currency-field";
import { BottomAction, primaryButton } from "@/components/send/sheet-shell";
import { formatCnpjInput } from "@/lib/format";
import { validateProfile, type ProfileField, type ProfileInput } from "@/server/profile/validate";

type Errors = Partial<Record<ProfileField, string>>;

/** Cadastro do MEI: serve para o primeiro uso (criar) e para editar. Erro específico em cada campo. */
export function ProfileForm({
  initial,
  today,
  mode,
}: {
  initial: ProfileInput;
  today: string;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileInput>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: ProfileField) => (v: string) => setValues((s) => ({ ...s, [key]: key === "taxId" ? formatCnpjInput(v) : v }));

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const check = validateProfile(values, today);
    if (!check.ok) return setErrors(check.errors);
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const fields = typeof body === "object" && body !== null && "fields" in body && typeof body.fields === "object" ? (body.fields as Errors) : {};
        const message = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string" ? body.message : "Não foi possível salvar agora. Tente de novo.";
        setErrors(fields);
        setFormError(Object.keys(fields).length > 0 ? null : message);
        return;
      }
      router.push(mode === "create" ? "/" : "/perfil");
      router.refresh();
    } catch {
      setFormError("Sem conexão com o servidor. Confira a internet e tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="divide-y divide-sep rounded-card bg-card">
        <TextField label="Nome do MEI" value={values.name} onChange={set("name")} error={errors.name} maxLength={80} placeholder="Ex.: Doces da Marta MEI" autoComplete="organization" autoCapitalize="words" enterKeyHint="next" />
        <TextField label="CNPJ" value={values.taxId} onChange={set("taxId")} error={errors.taxId} placeholder="00.000.000/0000-00" inputMode="numeric" autoComplete="off" enterKeyHint="next" />
        <TextField label="Data de abertura" type="date" value={values.openingDate} max={today} onChange={set("openingDate")} error={errors.openingDate} />
        <TextField label="E-mail para os alertas" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" enterKeyHint="done" value={values.email} onChange={set("email")} error={errors.email} maxLength={120} placeholder="voce@exemplo.com" />
      </div>
      <p className="t-sub mt-2 px-5 text-label-2">
        A data de abertura define o limite do primeiro ano (proporcional aos meses de atividade). O CNPJ decide se uma nota é receita ou despesa.
        {mode === "edit" && " Mudar o CNPJ não altera os lançamentos que já foram confirmados."}
      </p>

      {formError && (
        <p role="alert" className="t-body mt-4 rounded-card bg-card p-4 text-danger-text">
          {formError}
        </p>
      )}

      <BottomAction>
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? "Salvando…" : mode === "create" ? "Começar" : "Salvar"}
        </button>
      </BottomAction>
    </form>
  );
}
