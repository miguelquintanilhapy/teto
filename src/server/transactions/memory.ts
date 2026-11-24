import {
  DuplicateTransactionError,
  type EventAction,
  type NewTransaction,
  type TransactionRecord,
  type TransactionsRepo,
} from "./service";

/** Versão em memória: testes e desenvolvimento sem banco. */
export class InMemoryTransactionsRepo implements TransactionsRepo {
  readonly rows: TransactionRecord[] = [];
  readonly events: Array<{ transactionId: string; action: EventAction; changes: Record<string, unknown> }> = [];
  /** Para testar a falha ao gravar o histórico. */
  failEvents = false;

  async insert(t: NewTransaction): Promise<TransactionRecord> {
    if (t.accessKey && this.rows.some((r) => r.profileId === t.profileId && r.accessKey === t.accessKey)) {
      throw new DuplicateTransactionError();
    }
    const row: TransactionRecord = { id: crypto.randomUUID(), ...t };
    this.rows.push(row);
    return row;
  }

  async findByDocumentId(profileId: string, documentId: string): Promise<TransactionRecord | null> {
    return this.rows.find((r) => r.profileId === profileId && r.documentId === documentId) ?? null;
  }

  async findByAccessKey(profileId: string, accessKey: string): Promise<TransactionRecord | null> {
    return this.rows.find((r) => r.profileId === profileId && r.accessKey === accessKey) ?? null;
  }

  async listByYear(profileId: string, year: number): Promise<TransactionRecord[]> {
    return this.rows
      .filter((r) => r.profileId === profileId && r.date.startsWith(`${year}-`))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async remove(id: string): Promise<void> {
    const i = this.rows.findIndex((r) => r.id === id);
    if (i >= 0) this.rows.splice(i, 1);
  }

  async addEvent(e: { transactionId: string; action: EventAction; changes: Record<string, unknown> }): Promise<void> {
    if (this.failEvents) throw new Error("histórico indisponível");
    this.events.push(e);
  }
}
