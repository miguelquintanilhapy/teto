"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSessionValue, writeSessionValue } from "@/components/prefs/use-session";
import { CheckCircle, FileCsv, LockSimple, Warning } from "@phosphor-icons/react/dist/ssr";
import { formatFullShortDate, formatMoney, formatReais } from "@/lib/format";
import { launchHref, reconcileStatement, type ReceiptLike } from "@/lib/reconciliation";
import { parseStatementCsv, type ParsedStatement } from "@/lib/statement";

const MAX_BYTES = 2 * 1024 * 1024;
const SESSION_KEY = "teto-extrato";

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-6" aria-label={title}>
      <h2 className="mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">
        {title} · {count}
      </h2>
      {children}
    </section>
  );
}

/**
 * Importa o extrato do banco e confronta com as receitas lançadas. O arquivo é lido aqui, no
 * navegador, e nunca é enviado ao servidor.
 */
export function StatementImporter({ receipts }: { receipts: ReceiptLike[] }) {
  const [error, setError] = useState<string | null>(null);

  // O extrato lido fica só nesta aba: ao lançar uma entrada e voltar, ele continua aqui, já reconciliado
  // com a receita nova. Some ao fechar a aba ou em "Limpar".
  const raw = useSessionValue(SESSION_KEY);
  const stored = useMemo<{ fileName: string; parsed: ParsedStatement } | null>(() => {
    if (!raw) return null;
    try {
      const v = JSON.parse(raw) as { fileName: string; parsed: ParsedStatement };
      return Array.isArray(v.parsed?.entries) ? v : null;
    } catch {
      return null;
    }
  }, [raw]);
  const parsed = stored?.parsed ?? null;
  const fileName = stored?.fileName ?? "";

  const view = useMemo(() => (parsed && parsed.error === null ? reconcileStatement(parsed.entries, receipts) : null), [parsed, receipts]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) return setError("O arquivo passa de 2 MB. Exporte um período menor.");
    if (!/\.(csv|txt)$/i.test(file.name) && !file.type.includes("csv") && !file.type.startsWith("text/")) {
      return setError("Envie o extrato em CSV. Em PDF o Teto ainda não lê extratos.");
    }
    const result = parseStatementCsv(await file.text());
    if (result.error) {
      writeSessionValue(SESSION_KEY, null);
      return setError(result.error);
    }
    writeSessionValue(SESSION_KEY, JSON.stringify({ fileName: file.name, parsed: result }));
  }

  return (
    <>
      <section className="rounded-card bg-card p-5">
        <span className="grid size-14 place-items-center rounded-2xl bg-tile">
          <FileCsv size={30} weight="fill" aria-hidden="true" />
        </span>
        <h2 className="t-title mt-3">Compare o banco com as notas</h2>
        <p className="t-sub mt-2 flex items-center gap-1.5 font-semibold text-label">
          <LockSimple size={15} weight="fill" aria-hidden="true" />
          O extrato é lido só neste aparelho. Nada é enviado.
        </p>
        <p className="t-body mt-2 text-label-2">
          Escolha o extrato em CSV. Aparecem as entradas no banco que não têm nota: podem ser receita ainda não lançada.
        </p>
        <label className="pressable mt-4 flex h-[3.375rem] w-full cursor-pointer items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-label">
          {parsed ? "Escolher outro extrato" : "Escolher extrato (CSV)"}
          <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onFile} className="sr-only" />
        </label>
      </section>

      {error && (
        <p role="alert" className="t-body mt-4 flex items-start gap-2 rounded-card bg-card p-4 text-danger-text">
          <Warning size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {view && parsed && (
        <div aria-live="polite">
          <p className="t-sub mt-4 px-2 text-label-2">
            {fileName}: {view.creditCount} entradas ({formatReais(view.creditTotalCents)}) e {parsed.entries.length - view.creditCount} saídas
            {parsed.skipped > 0 && `. ${parsed.skipped} linhas não deram para ler.`}{" "}
            <button type="button" onClick={() => writeSessionValue(SESSION_KEY, null)} className="min-h-11 font-semibold text-action underline underline-offset-2">
              Limpar
            </button>
          </p>

          <Section title="Entradas sem nota" count={view.unmatchedCredits.length}>
            {view.unmatchedCredits.length === 0 ? (
              <p className="t-body flex items-center gap-2 rounded-card bg-card p-5 text-ok-text">
                <CheckCircle size={22} weight="fill" aria-hidden="true" /> Todas as entradas têm nota.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-sep rounded-card bg-card">
                  {view.unmatchedCredits.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="sensitive text-[1.0625rem] font-semibold">+ {formatMoney(c.amountCents)}</p>
                        <p className="t-sub truncate text-label-2">
                          {formatFullShortDate(c.date)}
                          {c.description && ` · ${c.description}`}
                        </p>
                      </div>
                      <Link href={launchHref(c)} className="pressable inline-flex min-h-11 shrink-0 items-center rounded-full bg-primary px-4 text-[0.9375rem] font-bold text-on-primary">
                        Lançar
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="t-sub mt-2 px-5 text-label-2">
                  Somam <span className="sensitive font-semibold">{formatMoney(view.unmatchedCreditsTotalCents)}</span>. Se for receita do MEI, lance para contar no limite.
                </p>
              </>
            )}
          </Section>

          <Section title="Notas sem entrada no banco" count={view.unmatchedReceipts.length}>
            {view.unmatchedReceipts.length === 0 ? (
              <p className="t-body rounded-card bg-card p-5 text-label-2">Toda receita do período aparece no extrato.</p>
            ) : (
              <ul className="divide-y divide-sep rounded-card bg-card">
                {view.unmatchedReceipts.map((r) => (
                  <li key={r.id} className="px-5 py-3.5">
                    <p className="sensitive text-[1.0625rem] font-semibold">{formatMoney(r.amountCents)}</p>
                    <p className="t-sub text-label-2">
                      {formatFullShortDate(r.date)} · {r.description || "Sem descrição"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Conciliadas" count={view.matched.length}>
            {view.matched.length > 0 && (
              <ul className="divide-y divide-sep rounded-card bg-card">
                {view.matched.map((m) => (
                  <li key={m.credit.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="sensitive text-[1.0625rem] font-semibold">{formatMoney(m.credit.amountCents)}</p>
                      <p className="t-sub truncate text-label-2">{m.receipt.description || "Sem descrição"}</p>
                    </div>
                    <p className="t-caption shrink-0 text-label-2">{m.dayDiff === 0 ? "mesmo dia" : `${m.dayDiff} dia${m.dayDiff > 1 ? "s" : ""} de diferença`}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </>
  );
}
