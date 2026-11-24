import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DuplicateTransactionError,
  type EventAction,
  type NewTransaction,
  type TransactionRecord,
  type TransactionsRepo,
} from "./service";

/** Código do Postgres para violação de restrição de unicidade. */
const UNIQUE_VIOLATION = "23505";

interface TransactionRow {
  id: string;
  profile_id: string;
  document_id: string | null;
  date: string;
  issue_date: string | null;
  amount_cents: number | string; // bigint pode vir como texto
  kind: TransactionRecord["kind"];
  source: TransactionRecord["source"];
  status: TransactionRecord["status"];
  counterparty_tax_id: string | null;
  access_key: string | null;
  description: string;
  confidence: number | null;
}

const fromRow = (r: TransactionRow): TransactionRecord => ({
  id: r.id,
  profileId: r.profile_id,
  documentId: r.document_id,
  date: r.date,
  issueDate: r.issue_date,
  amountCents: Number(r.amount_cents),
  kind: r.kind,
  source: r.source,
  status: r.status,
  counterpartyTaxId: r.counterparty_tax_id,
  accessKey: r.access_key,
  description: r.description,
  confidence: r.confidence,
});

export class SupabaseTransactionsRepo implements TransactionsRepo {
  constructor(private readonly db: SupabaseClient) {}

  async insert(t: NewTransaction): Promise<TransactionRecord> {
    const { data, error } = await this.db
      .from("transactions")
      .insert({
        profile_id: t.profileId,
        document_id: t.documentId,
        date: t.date,
        issue_date: t.issueDate,
        amount_cents: t.amountCents,
        kind: t.kind,
        source: t.source,
        status: t.status,
        counterparty_tax_id: t.counterpartyTaxId,
        access_key: t.accessKey,
        description: t.description,
        confidence: t.confidence,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === UNIQUE_VIOLATION) throw new DuplicateTransactionError();
      throw new Error(`transactions: ${error.message}`);
    }
    return fromRow(data as TransactionRow);
  }

  async findByDocumentId(profileId: string, documentId: string): Promise<TransactionRecord | null> {
    const { data, error } = await this.db
      .from("transactions")
      .select("*")
      .eq("profile_id", profileId)
      .eq("document_id", documentId)
      .maybeSingle();
    if (error) throw new Error(`transactions: ${error.message}`);
    return data ? fromRow(data as TransactionRow) : null;
  }

  async findByAccessKey(profileId: string, accessKey: string): Promise<TransactionRecord | null> {
    const { data, error } = await this.db
      .from("transactions")
      .select("*")
      .eq("profile_id", profileId)
      .eq("access_key", accessKey)
      .maybeSingle();
    if (error) throw new Error(`transactions: ${error.message}`);
    return data ? fromRow(data as TransactionRow) : null;
  }

  async listByYear(profileId: string, year: number): Promise<TransactionRecord[]> {
    const { data, error } = await this.db
      .from("transactions")
      .select("*")
      .eq("profile_id", profileId)
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(`transactions: ${error.message}`);
    return ((data ?? []) as TransactionRow[]).map(fromRow);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from("transactions").delete().eq("id", id);
    if (error) throw new Error(`transactions: ${error.message}`);
  }

  async addEvent(e: { transactionId: string; action: EventAction; changes: Record<string, unknown> }): Promise<void> {
    const { error } = await this.db
      .from("transaction_events")
      .insert({ transaction_id: e.transactionId, action: e.action, changes: e.changes });
    if (error) throw new Error(`transaction_events: ${error.message}`);
  }
}
