import { buildDashboard, monthlyRevenue, yearOf, type Cents, type Dashboard, type ISODate } from "@/core";
import type { TransactionsHandlerDeps } from "@/server/http/transactions-handler";
import { toCore, type TransactionRecord } from "@/server/transactions/service";

/** Lançamento como a interface precisa: sem identificadores internos do banco. */
export interface TransactionView {
  id: string;
  date: ISODate;
  amountCents: Cents;
  kind: "receita" | "despesa";
  source: "nota" | "pix" | "manual";
  status: "pendente" | "confirmada" | "cancelada";
  description: string;
  counterpartyTaxId: string | null;
}

export interface PanelData {
  today: ISODate;
  profile: { name: string; taxId: string; openingDate: ISODate };
  dashboard: Dashboard;
  /** Receita confirmada de cada mês do ano (índice 0 = janeiro). */
  months: Cents[];
  /** Mais novas primeiro. */
  transactions: TransactionView[];
}

const view = (t: TransactionRecord): TransactionView => ({
  id: t.id,
  date: t.date,
  amountCents: t.amountCents,
  kind: t.kind,
  source: t.source,
  status: t.status,
  description: t.description,
  counterpartyTaxId: t.counterpartyTaxId,
});

/**
 * Tudo o que as telas do painel e do histórico precisam, numa só leitura.
 * Devolve null quando o perfil de demonstração ainda não foi criado.
 */
export async function loadPanel(deps: TransactionsHandlerDeps): Promise<PanelData | null> {
  const profile = await deps.profiles.getDemoProfile();
  if (!profile) return null;
  const today = deps.clock.today();
  const year = yearOf(today);
  const rows = await deps.transactions.listByYear(profile.id, year);
  const core = rows.map(toCore);
  return {
    today,
    profile: { name: profile.name, taxId: profile.taxId, openingDate: profile.openingDate },
    dashboard: buildDashboard({ transactions: core, today, openingDate: profile.openingDate }),
    months: monthlyRevenue(core, year, today),
    transactions: rows.map(view).sort((a, b) => b.date.localeCompare(a.date)),
  };
}
