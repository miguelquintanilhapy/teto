import {
  addDays,
  deriveDirection,
  isValidAccessKey,
  isValidISODate,
  isValidTaxId,
  type ISODate,
  type Transaction as CoreTransaction,
} from "@/core";
import type { ProfileRecord } from "@/server/extraction/service";

// ---------------------------------------------------------------- tipos e portas
export type TransactionSource = "nota" | "pix" | "manual";
export type TransactionKind = "receita" | "despesa";
export type TransactionStatus = "pendente" | "confirmada" | "cancelada";

export interface TransactionRecord {
  id: string;
  profileId: string;
  documentId: string | null;
  /** Data que conta para o limite. */
  date: ISODate;
  issueDate: ISODate | null;
  amountCents: number;
  kind: TransactionKind;
  source: TransactionSource;
  status: TransactionStatus;
  /** A outra parte da transação, depois de derivada a direção. */
  counterpartyTaxId: string | null;
  accessKey: string | null;
  description: string;
  confidence: number | null;
}

export type NewTransaction = Omit<TransactionRecord, "id">;

export type EventAction = "created" | "corrected" | "confirmed" | "cancelled";

/** Lançado pelo repositório quando a restrição única (perfil, chave de acesso) é violada. */
export class DuplicateTransactionError extends Error {
  constructor() {
    super("transação duplicada");
    this.name = "DuplicateTransactionError";
  }
}

export interface TransactionsRepo {
  insert(t: NewTransaction): Promise<TransactionRecord>;
  findByDocumentId(profileId: string, documentId: string): Promise<TransactionRecord | null>;
  findByAccessKey(profileId: string, accessKey: string): Promise<TransactionRecord | null>;
  /** Todas as transações do ano (qualquer status), da mais antiga para a mais nova. */
  listByYear(profileId: string, year: number): Promise<TransactionRecord[]>;
  /** Usado só para desfazer uma inserção quando o registro do histórico falha. */
  remove(id: string): Promise<void>;
  addEvent(event: { transactionId: string; action: EventAction; changes: Record<string, unknown> }): Promise<void>;
}

/** Visão mínima para o motor de regras do núcleo. */
export const toCore = (t: TransactionRecord): CoreTransaction => ({
  id: t.id,
  date: t.date,
  amountCents: t.amountCents,
  kind: t.kind,
  status: t.status,
});

// ------------------------------------------------------------------- confirmação
/** Teto de sanidade por lançamento (R$ 10 milhões), contra erro de digitação e abuso. */
const MAX_AMOUNT_CENTS = 1_000_000_000;

export interface ConfirmInput {
  profileId: string;
  documentId?: string | null;
  date: string;
  issueDate?: string | null;
  amountCents: number;
  issuerTaxId?: string | null;
  recipientTaxId?: string | null;
  /** Escolha explícita do usuário; obrigatória só se o código não conseguir derivar. */
  kind?: TransactionKind;
  source: TransactionSource;
  accessKey?: string | null;
  description?: string;
  confidence?: number | null;
}

export type InvalidCode =
  | "invalid_date"
  | "future_date"
  | "invalid_amount"
  | "invalid_tax_id"
  | "invalid_access_key"
  | "direction_required";

export type ConfirmOutcome =
  | { status: "created"; transaction: TransactionRecord }
  /** Já existia (mesmo documento ou mesma chave de acesso): devolve o existente, sem duplicar. */
  | { status: "duplicate"; transaction: TransactionRecord }
  | { status: "invalid"; code: InvalidCode; message: string };

const invalid = (code: InvalidCode, message: string): ConfirmOutcome => ({ status: "invalid", code, message });
const digits = (s: string) => s.replace(/\D/g, "");
const present = (s: string | null | undefined): s is string => typeof s === "string" && s.trim() !== "";

/**
 * Confirma um lançamento depois da conferência do usuário. É só aqui que um valor
 * passa a contar no limite. A direção (receita ou despesa) é decidida pelo código a
 * partir do CNPJ do MEI; o usuário só escolhe quando o código não consegue.
 */
export async function confirmTransaction(
  input: ConfirmInput,
  deps: { transactions: TransactionsRepo; profile: ProfileRecord; today: ISODate },
): Promise<ConfirmOutcome> {
  const { transactions, profile, today } = deps;

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || input.amountCents > MAX_AMOUNT_CENTS) {
    return invalid("invalid_amount", "O valor deve ser positivo, em centavos, e de até R$ 10 milhões.");
  }
  if (!isValidISODate(input.date) || input.date < "2000-01-01") {
    return invalid("invalid_date", "Data inválida. Use o formato AAAA-MM-DD.");
  }
  if (input.date > addDays(today, 1)) {
    return invalid("future_date", "A data não pode estar no futuro.");
  }
  if (present(input.issueDate) && !isValidISODate(input.issueDate)) {
    return invalid("invalid_date", "Data de emissão inválida. Use o formato AAAA-MM-DD.");
  }
  for (const id of [input.issuerTaxId, input.recipientTaxId]) {
    if (present(id) && !isValidTaxId(id)) {
      return invalid("invalid_tax_id", "CPF ou CNPJ com dígito verificador inválido.");
    }
  }
  const accessKey = present(input.accessKey) ? digits(input.accessKey) : null;
  if (accessKey !== null && !isValidAccessKey(accessKey)) {
    return invalid("invalid_access_key", "Chave de acesso inválida: confira os 44 dígitos ou deixe em branco.");
  }

  const issuer = present(input.issuerTaxId) ? digits(input.issuerTaxId) : null;
  const recipient = present(input.recipientTaxId) ? digits(input.recipientTaxId) : null;
  const derived = deriveDirection(profile.taxId, issuer, recipient);
  const kind: TransactionKind | null = input.kind ?? (derived === "indefinida" ? null : derived);
  if (kind === null) {
    return invalid(
      "direction_required",
      "Não consegui saber se é receita ou despesa pelos CPF/CNPJ. Informe o tipo.",
    );
  }

  // Idempotência: o mesmo documento ou a mesma nota nunca vira dois lançamentos.
  if (present(input.documentId)) {
    const existing = await transactions.findByDocumentId(profile.id, input.documentId);
    if (existing) return { status: "duplicate", transaction: existing };
  }
  if (accessKey !== null) {
    const existing = await transactions.findByAccessKey(profile.id, accessKey);
    if (existing) return { status: "duplicate", transaction: existing };
  }

  const row: NewTransaction = {
    profileId: profile.id,
    documentId: present(input.documentId) ? input.documentId : null,
    date: input.date,
    issueDate: present(input.issueDate) ? input.issueDate : null,
    amountCents: input.amountCents,
    kind,
    source: input.source,
    status: "confirmada",
    counterpartyTaxId: kind === "receita" ? recipient : issuer,
    accessKey,
    description: (input.description ?? "").trim().slice(0, 300),
    confidence: input.confidence ?? null,
  };

  let created: TransactionRecord;
  try {
    created = await transactions.insert(row);
  } catch (e) {
    if (!(e instanceof DuplicateTransactionError)) throw e;
    // Outra confirmação da mesma nota chegou primeiro.
    const existing = accessKey !== null ? await transactions.findByAccessKey(profile.id, accessKey) : null;
    if (!existing) throw e;
    return { status: "duplicate", transaction: existing };
  }

  try {
    await transactions.addEvent({
      transactionId: created.id,
      action: "confirmed",
      changes: { kind, derivedKind: derived, source: input.source },
    });
  } catch (e) {
    // Sem histórico não há lançamento: desfaz para não deixar valor contando sem rastro.
    await transactions.remove(created.id).catch(() => undefined);
    throw e;
  }
  return { status: "created", transaction: created };
}
