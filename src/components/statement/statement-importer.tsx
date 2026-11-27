"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSessionValue, writeSessionValue } from "@/components/prefs/use-session";
import { CheckCircle, FileCsv, LockSimple, Warning } from "@phosphor-icons/react/dist/ssr";
import { formatDayMonth, formatFullShortDate, formatMoney, formatReais, formatShortDate } from "@/lib/format";
import { groupByDay } from "@/lib/history";
import { launchHref, reconcileStatement, type ReceiptLike } from "@/lib/reconciliation";
import { parseStatementCsv, type ParsedStatement } from "@/lib/statement";

const MAX_BYTES = 2 * 1024 * 1024;
const SESSION_KEY = "teto-extrato";

type Tab = "sem-nota" | "sem-entrada" | "conferidas";

interface Stored {
  fileName: string;
  parsed: ParsedStatement;
  /** Entradas marcadas como "não é receita" (pelo id da linha no arquivo). */
  dismissed?: string[];
}

/**
 * Importa o extrato do banco e confronta com as receitas lançadas. O arquivo é lido aqui, no
 * navegador, e nunca é enviado ao servidor.
 *
 * Antes do arquivo, a tela explica e pede o CSV. Depois, mostra primeiro a resposta (quanto entrou no banco sem
 * nota), e as três listas ficam num controle segmentado. Cada entrada sem nota pode ser lançada ou marcada como
 * "não é receita", e então sai da lista: ela encolhe conforme a pessoa confere.
 */
export function StatementImporter({ receipts }: { receipts: ReceiptLike[] }) {
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("sem-nota");

  // O extrato lido fica só nesta aba: ao lançar uma entrada e voltar, ele continua aqui, já reconciliado
  // com a receita nova. Some ao fechar a aba ou em "Limpar".
  const raw = useSessionValue(SESSION_KEY);
  const stored = useMemo<Stored | null>(() => {
    if (!raw) return null;
    try {
      const v = JSON.parse(raw) as Stored;
      return Array.isArray(v.parsed?.entries) ? v : null;
    } catch {
      return null;
    }
  }, [raw]);
  const parsed = stored?.parsed ?? null;
  const fileName = stored?.fileName ?? "";
  const dismissed = useMemo(() => new Set(stored?.dismissed ?? []), [stored]);

  const view = useMemo(
    () => (parsed && parsed.error === null ? reconcileStatement(parsed.entries, receipts, 3, dismissed) : null),
    [parsed, receipts, dismissed],
  );

  function save(next: Stored | null) {
    writeSessionValue(SESSION_KEY, next ? JSON.stringify(next) : null);
  }

  function setDismissed(ids: string[]) {
    if (stored) save({ ...stored, dismissed: ids });
  }

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
      save(null);
      return setError(result.error);
    }
    setTab("sem-nota");
    save({ fileName: file.name, parsed: result, dismissed: [] });
  }

  const fileInput = <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onFile} className="sr-only" />;
  const errorBox = error && (
    <p role="alert" className="t-body mt-4 flex items-start gap-2 rounded-card bg-card p-4 text-danger-text">
      <Warning size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
      {error}
    </p>
  );

  if (!view || !parsed) {
    return (
      <>
        <section className="rounded-card bg-card p-5">
          <span className="grid size-14 place-items-center rounded-2xl bg-tile">
            <FileCsv size={30} weight="fill" aria-hidden="true" />
          </span>
          <h2 className="t-title mt-3">Ache vendas que faltam no Teto</h2>
          <p className="t-body mt-2 text-label-2">
            Escolha o extrato do banco em CSV. O Teto mostra as entradas que não têm nota: podem ser vendas que ainda não entraram na conta do limite.
          </p>
          <p className="t-sub mt-2 flex items-center gap-1.5 font-semibold text-label">
            <LockSimple size={15} weight="fill" aria-hidden="true" />
            O extrato é lido só neste aparelho. Nada é enviado.
          </p>
          <label className="pressable mt-4 flex h-[3.375rem] w-full cursor-pointer items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-label">
            Escolher extrato (CSV)
            {fileInput}
          </label>
        </section>
        {errorBox}
      </>
    );
  }

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "sem-nota", label: "Sem nota", count: view.unmatchedCredits.length },
    { id: "sem-entrada", label: "Sem entrada", count: view.unmatchedReceipts.length },
    { id: "conferidas", label: "Conferidas", count: view.matched.length },
  ];
  const tabIndex = tabs.findIndex((t) => t.id === tab);
  const pending = view.unmatchedCredits.length;

  return (
    <>
      {/* O arquivo, em uma linha: o cartão grande de explicação já cumpriu o papel. */}
      <section className="flex items-center gap-3 rounded-card bg-card px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tile">
          <FileCsv size={22} weight="fill" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold">{fileName}</p>
          <p className="t-sub truncate text-label-2">
            {view.period ? `${formatShortDate(view.period.first)} a ${formatShortDate(view.period.last)}` : "Extrato lido"}
          </p>
        </div>
        <label className="pressable flex min-h-11 shrink-0 cursor-pointer items-center rounded-full bg-tile px-3.5 text-[0.9375rem] font-semibold text-action focus-within:outline-2 focus-within:outline-primary">
          Trocar
          {fileInput}
        </label>
      </section>
      {errorBox}

      {/* A resposta primeiro, em número grande, como no Simular. */}
      <section aria-live="polite" className="mt-3 rounded-card bg-card p-5">
        {pending > 0 ? (
          <>
            <p className="t-sub text-label-2">Entraram no banco sem nota</p>
            <p className="t-display sensitive mt-0.5 text-[clamp(2rem,10vw,2.625rem)]">{formatReais(view.unmatchedCreditsTotalCents)}</p>
            <p className="t-body mt-1 text-label-2">
              {pending} {pending === 1 ? "entrada" : "entradas"} para conferir. Se for venda do MEI, lance para contar no limite.
            </p>
          </>
        ) : (
          <p className="t-title flex items-center gap-2 text-ok-text">
            <CheckCircle size={26} weight="fill" aria-hidden="true" />
            Todas as entradas foram conferidas
          </p>
        )}
        <p className="t-sub mt-3 border-t border-sep pt-3 text-label-2">
          {view.creditCount} {view.creditCount === 1 ? "entrada" : "entradas"} e {view.debitCount} {view.debitCount === 1 ? "saída" : "saídas"} no extrato.
          {view.ownMovementCount > 0 &&
            (view.ownMovementCount === 1
              ? " 1 movimentação sua (resgate de cofrinho, estorno ou transferência entre contas) ficou de fora: não é venda."
              : ` ${view.ownMovementCount} movimentações suas (resgates de cofrinho, estornos, transferências entre contas) ficaram de fora: não são venda.`)}
          {parsed.skipped > 0 && ` ${parsed.skipped} ${parsed.skipped === 1 ? "linha sem data ou valor foi ignorada" : "linhas sem data ou valor foram ignoradas"}.`}{" "}
          <button type="button" onClick={() => save(null)} className="font-semibold text-action">
            Limpar
          </button>
        </p>
      </section>

      <div role="radiogroup" aria-label="Mostrar" className="relative mt-4 grid grid-cols-3 rounded-2xl bg-track p-[3px] text-[0.875rem] font-semibold">
        <span
          aria-hidden="true"
          className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-[0.8125rem] bg-raised shadow-sm motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.3,0.9,0.3,1)]"
          style={{ transform: `translateX(${tabIndex * 100}%)` }}
        />
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={t.id === tab}
            onClick={() => setTab(t.id)}
            className={`pressable relative min-h-11 min-w-0 truncate rounded-[0.8125rem] px-1 py-2.5 ${t.id === tab ? "text-label" : "text-label-2"}`}
          >
            {t.label} <span className="font-normal">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "sem-nota" && (
        <div className="mt-4">
          {pending === 0 ? (
            <p className="t-body rounded-card bg-card p-5 text-label-2">Nenhuma entrada esperando conferência.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {groupByDay(view.unmatchedCredits).map(([date, items]) => (
                <section key={date} aria-labelledby={`e-${date}`}>
                  <h3 id={`e-${date}`} className="mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">
                    {formatDayMonth(date)}
                  </h3>
                  <ul className="divide-y divide-sep overflow-hidden rounded-card bg-card">
                    {items.map((c) => (
                      <li key={c.id} className="px-5 py-3.5">
                        <div className="flex items-baseline justify-between gap-3">
                          {/* Quem pagou é o que decide se é venda: vem primeiro. */}
                          <p className="min-w-0 truncate text-[1.0625rem] font-semibold">{c.description || c.type || "Entrada"}</p>
                          <p className="sensitive shrink-0 text-[1.0625rem] font-semibold whitespace-nowrap">+ {formatMoney(c.amountCents)}</p>
                        </div>
                        {c.description && c.type && <p className="t-sub truncate text-label-2">{c.type}</p>}
                        <div className="mt-2.5 flex items-center gap-5">
                          <Link
                            href={launchHref(c)}
                            className="pressable relative inline-flex h-9 items-center rounded-full bg-primary px-4 text-[0.9375rem] font-bold whitespace-nowrap text-on-primary before:absolute before:-inset-1 before:content-['']"
                          >
                            Lançar
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDismissed([...dismissed, c.id])}
                            className="pressable inline-flex min-h-11 items-center text-[0.9375rem] font-medium whitespace-nowrap text-action"
                          >
                            Não é receita
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          {view.dismissedCount > 0 && (
            <p className="t-sub mt-3 px-5 text-label-2">
              {view.dismissedCount} {view.dismissedCount === 1 ? "marcada" : "marcadas"} como não receita.{" "}
              <button type="button" onClick={() => setDismissed([])} className="font-semibold text-action">
                Desfazer
              </button>
            </p>
          )}
        </div>
      )}

      {tab === "sem-entrada" && (
        <div className="mt-4">
          <p className="t-sub mb-2 px-5 text-label-2">
            Receitas lançadas no Teto que não aparecem neste extrato. Pode ter sido paga em dinheiro ou em outra conta: não é erro.
          </p>
          {view.unmatchedReceipts.length === 0 ? (
            <p className="t-body rounded-card bg-card p-5 text-label-2">Toda receita do período aparece no extrato.</p>
          ) : (
            <ul className="divide-y divide-sep rounded-card bg-card">
              {view.unmatchedReceipts.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[1.0625rem] font-semibold">{r.description || "Receita sem descrição"}</p>
                    <p className="t-sub text-label-2">{formatFullShortDate(r.date)}</p>
                  </div>
                  <p className="sensitive shrink-0 text-[1.0625rem] font-semibold whitespace-nowrap">{formatMoney(r.amountCents)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "conferidas" && (
        <div className="mt-4">
          {view.matched.length === 0 ? (
            <p className="t-body rounded-card bg-card p-5 text-label-2">Nenhuma entrada bateu com uma nota ainda. Ao lançar uma entrada, ela aparece aqui.</p>
          ) : (
            <ul className="divide-y divide-sep rounded-card bg-card">
              {view.matched.map((m) => (
                <li key={m.credit.id} className="flex items-center gap-3 px-5 py-3.5">
                  <CheckCircle size={22} weight="fill" className="shrink-0 text-ok" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[1.0625rem] font-semibold">{m.receipt.description || "Receita sem descrição"}</p>
                    <p className="t-sub truncate text-label-2">
                      {formatShortDate(m.credit.date)} · {m.dayDiff === 0 ? "entrou no mesmo dia da nota" : `${m.dayDiff} dia${m.dayDiff > 1 ? "s" : ""} de diferença da nota`}
                    </p>
                  </div>
                  <p className="sensitive shrink-0 text-[1.0625rem] font-semibold whitespace-nowrap">{formatMoney(m.credit.amountCents)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
