"use client";

import { useId } from "react";
import { centsFromInput } from "@/lib/send";
import { formatMoney } from "@/lib/format";

/** Campo de dinheiro com máscara: o usuário digita só números e o valor sobe da direita para a esquerda. */
export function CurrencyField({
  label,
  cents,
  onChange,
  error,
}: {
  label: string;
  cents: number;
  onChange: (cents: number) => void;
  error?: string;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className="px-5 py-3">
      <label htmlFor={id} className="t-sub text-label-2">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={cents === 0 ? "" : formatMoney(cents)}
        placeholder="R$ 0,00"
        onChange={(e) => onChange(centsFromInput(e.target.value))}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className="mt-0.5 block w-full bg-transparent text-[1.375rem] font-semibold tracking-tight outline-none placeholder:text-label-2/60"
      />
      {error && (
        <p id={errId} role="alert" className="t-sub mt-1 text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}

/** Campo de texto simples no mesmo estilo de linha agrupada. */
export function TextField({
  label,
  type = "text",
  value,
  onChange,
  error,
  max,
  placeholder,
  maxLength,
}: {
  label: string;
  type?: "text" | "date";
  value: string;
  onChange: (v: string) => void;
  error?: string;
  max?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className="px-5 py-3">
      <label htmlFor={id} className="t-sub text-label-2">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        max={max}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className="mt-0.5 block w-full bg-transparent text-[1.1875rem] font-medium outline-none placeholder:text-label-2/60"
      />
      {error && (
        <p id={errId} role="alert" className="t-sub mt-1 text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
