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

/** O que pode mudar depois de confirmado. Tipo, partes e chave de acesso nunca mudam. */
export type TransactionPatch = Partial<Pick<TransactionRecord, "date" | "amountCents" | "description" | "status">>;

export interface TransactionEvent {
  action: EventAction;
  changes: Record<string, unknown>;
  createdAt: string;
}

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
  findById(profileId: string, id: string): Promise<TransactionRecord | null>;
  /** Altera só os campos informados e devolve o lançamento atualizado (null se não existir). */
  update(profileId: string, id: string, patch: TransactionPatch): Promise<TransactionRecord | null>;
  /** Histórico de alterações do lançamento, do mais antigo para o mais novo. */
  listEvents(transactionId: string): Promise<TransactionEvent[]>;
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
  | "direction_required"
  | "direction_conflict";

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
  // O código decide a direção quando consegue. O usuário só escolhe quando não dá para derivar:
  // impor o contrário do que o CNPJ do MEI mostra tiraria uma receita do cálculo do limite.
  if (input.kind !== undefined && derived !== "indefinida" && input.kind !== derived) {
    return invalid("direction_conflict", "O tipo não confere com o CNPJ do seu MEI na nota. Corrija a nota ou lance sem nota.");
  }
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
    confidence: input.source === "manual" ? null : (input.confidence ?? null),
  };

  let created: TransactionRecord;
  try {
    created = await transactions.insert(row);
  } catch (e) {
    if (!(e instanceof DuplicateTransactionError)) throw e;
    // Outra confirmação da mesma nota chegou primeiro.
    const existing =
      (accessKey !== null ? await transactions.findByAccessKey(profile.id, accessKey) : null) ??
      (present(input.documentId) ? await transactions.findByDocumentId(profile.id, input.documentId) : null);
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

// ------------------------------------------------------------ cancelar e corrigir
export type ChangeOutcome =
  | { status: "updated"; transaction: TransactionRecord }
  | { status: "not_found" }
  /** O lançamento existe, mas está num estado que não permite a mudança. */
  | { status: "conflict"; message: string }
  | { status: "invalid"; code: InvalidCode | "nothing_to_change"; message: string };

/**
 * Cancela um lançamento (estorno, devolução, nota cancelada): ele deixa de contar no limite,
 * mas continua no histórico. Idempotente: cancelar de novo devolve o mesmo resultado.
 */
export async function cancelTransaction(
  input: { profileId: string; id: string },
  deps: { transactions: TransactionsRepo },
): Promise<ChangeOutcome> {
  const { transactions } = deps;
  const current = await transactions.findById(input.profileId, input.id);
  if (!current) return { status: "not_found" };
  if (current.status === "cancelada") return { status: "updated", transaction: current };

  const updated = await transactions.update(input.profileId, input.id, { status: "cancelada" });
  if (!updated) return { status: "not_found" };
  try {
    await transactions.addEvent({ transactionId: updated.id, action: "cancelled", changes: { status: { from: current.status, to: "cancelada" } } });
  } catch (e) {
    // Sem histórico não há mudança: devolve o estado anterior para não deixar uma alteração sem rastro.
    await transactions.update(input.profileId, input.id, { status: current.status }).catch(() => undefined);
    throw e;
  }
  return { status: "updated", transaction: updated };
}

export interface CorrectInput {
  profileId: string;
  id: string;
  date?: string;
  amountCents?: number;
  description?: string;
}

/** Corrige valor, data ou descrição de um lançamento, com as mesmas regras da confirmação. */
export async function correctTransaction(
  input: CorrectInput,
  deps: { transactions: TransactionsRepo; today: ISODate },
): Promise<ChangeOutcome> {
  const { transactions, today } = deps;
  const current = await transactions.findById(input.profileId, input.id);
  if (!current) return { status: "not_found" };
  if (current.status === "cancelada") {
    return { status: "conflict", message: "Um lançamento cancelado não pode ser corrigido." };
  }

  const patch: TransactionPatch = {};
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  if (input.amountCents !== undefined) {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || input.amountCents > MAX_AMOUNT_CENTS) {
      return { status: "invalid", code: "invalid_amount", message: "O valor deve ser positivo, em centavos, e de até R$ 10 milhões." };
    }
    if (input.amountCents !== current.amountCents) {
      patch.amountCents = input.amountCents;
      changes.amountCents = { from: current.amountCents, to: input.amountCents };
    }
  }
  if (input.date !== undefined) {
    if (!isValidISODate(input.date)) return { status: "invalid", code: "invalid_date", message: "Data inválida. Use o formato AAAA-MM-DD." };
    if (input.date > addDays(today, 1)) return { status: "invalid", code: "future_date", message: "A data não pode estar no futuro." };
    if (input.date !== current.date) {
      patch.date = input.date;
      changes.date = { from: current.date, to: input.date };
    }
  }
  if (input.description !== undefined) {
    const description = input.description.trim().slice(0, 300);
    if (description !== current.description) {
      patch.description = description;
      changes.description = { from: current.description, to: description };
    }
  }

  if (Object.keys(patch).length === 0) {
    return { status: "invalid", code: "nothing_to_change", message: "Nada mudou. Altere o valor, a data ou a descrição." };
  }

  const updated = await transactions.update(input.profileId, input.id, patch);
  if (!updated) return { status: "not_found" };
  try {
    await transactions.addEvent({ transactionId: updated.id, action: "corrected", changes });
  } catch (e) {
    const back: TransactionPatch = {
      date: current.date,
      amountCents: current.amountCents,
      description: current.description,
    };
    await transactions.update(input.profileId, input.id, back).catch(() => undefined);
    throw e;
  }
  return { status: "updated", transaction: updated };
}
