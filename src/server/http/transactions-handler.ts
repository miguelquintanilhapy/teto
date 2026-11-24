import { z } from "zod";
import { buildDashboard, yearOf } from "@/core";
import type { Clock } from "@/server/clock";
import type { ProfileRecord, ProfilesRepo } from "@/server/extraction/service";
import {
  cancelTransaction,
  confirmTransaction,
  correctTransaction,
  toCore,
  type TransactionRecord,
  type TransactionsRepo,
} from "@/server/transactions/service";

export interface TransactionsHandlerDeps {
  profiles: ProfilesRepo;
  transactions: TransactionsRepo;
  clock: Clock;
}

const MAX_BODY_BYTES = 50_000;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** `.strict()`: campo desconhecido é erro. O cliente nunca define status, perfil nem id. */
const ConfirmBody = z
  .object({
    documentId: z.string().uuid().nullish(),
    date: z.string().max(10),
    issueDate: z.string().max(10).nullish(),
    amountCents: z.number(),
    issuerTaxId: z.string().max(30).nullish(),
    recipientTaxId: z.string().max(30).nullish(),
    kind: z.enum(["receita", "despesa"]).optional(),
    source: z.enum(["nota", "pix", "manual"]),
    accessKey: z.string().max(60).nullish(),
    description: z.string().max(300).optional(),
    confidence: z.number().min(0).max(1).nullish(),
  })
  .strict();

/** Só o que a interface precisa: nada de identificadores internos do banco. */
function view(t: TransactionRecord) {
  return {
    id: t.id,
    documentId: t.documentId,
    date: t.date,
    issueDate: t.issueDate,
    amountCents: t.amountCents,
    kind: t.kind,
    source: t.source,
    status: t.status,
    counterpartyTaxId: t.counterpartyTaxId,
    accessKey: t.accessKey,
    description: t.description,
  };
}

const NO_PROFILE = {
  error: "no_profile",
  message: "Perfil de demonstração não configurado. Rode npm run seed.",
};

function internal(e: unknown): Response {
  console.error("requisição falhou:", e instanceof Error ? `${e.name}: ${e.message.slice(0, 200)}` : "erro desconhecido");
  return json({ error: "internal", message: "Não foi possível processar o pedido agora." }, 500);
}

async function loadProfile(deps: TransactionsHandlerDeps): Promise<ProfileRecord | null> {
  return deps.profiles.getDemoProfile();
}

/** POST /api/transactions: confirma um lançamento depois da conferência do usuário. */
export async function handleConfirm(req: Request, deps: TransactionsHandlerDeps): Promise<Response> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return json({ error: "too_large", message: "Pedido grande demais." }, 413);
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "invalid_json", message: "Envie um JSON válido." }, 400);
  }
  const parsed = ConfirmBody.safeParse(raw);
  if (!parsed.success) {
    // Só o caminho e a mensagem do erro: nunca devolve os valores recebidos.
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return json({ error: "invalid_body", message: "Dados inválidos.", issues }, 400);
  }

  try {
    const profile = await loadProfile(deps);
    if (!profile) return json(NO_PROFILE, 503);
    const outcome = await confirmTransaction(
      { ...parsed.data, profileId: profile.id },
      { transactions: deps.transactions, profile, today: deps.clock.today() },
    );
    switch (outcome.status) {
      case "created":
        return json({ status: "created", transaction: view(outcome.transaction) }, 201);
      case "duplicate":
        return json({ status: "duplicate", transaction: view(outcome.transaction) });
      case "invalid":
        return json({ error: outcome.code, message: outcome.message }, 422);
    }
  } catch (e) {
    return internal(e);
  }
}

const YearParam = z.coerce.number().int().min(2000).max(2100);

/** GET /api/transactions?year=2026: lançamentos do ano (padrão: o ano de hoje). */
export async function handleList(req: Request, deps: TransactionsHandlerDeps): Promise<Response> {
  const yearRaw = new URL(req.url).searchParams.get("year");
  const parsedYear = yearRaw === null ? null : YearParam.safeParse(yearRaw);
  if (parsedYear && !parsedYear.success) {
    return json({ error: "invalid_year", message: "O ano deve estar entre 2000 e 2100." }, 400);
  }
  try {
    const profile = await loadProfile(deps);
    if (!profile) return json(NO_PROFILE, 503);
    const year = parsedYear?.data ?? yearOf(deps.clock.today());
    const rows = await deps.transactions.listByYear(profile.id, year);
    return json({ year, transactions: rows.map(view) });
  } catch (e) {
    return internal(e);
  }
}

/** GET /api/dashboard: o resumo do limite do MEI no ano de hoje. */
export async function handleDashboard(_req: Request, deps: TransactionsHandlerDeps): Promise<Response> {
  try {
    const profile = await loadProfile(deps);
    if (!profile) return json(NO_PROFILE, 503);
    const today = deps.clock.today();
    const rows = await deps.transactions.listByYear(profile.id, yearOf(today));
    const dashboard = buildDashboard({ transactions: rows.map(toCore), today, openingDate: profile.openingDate });
    return json({ today, profile: { name: profile.name, openingDate: profile.openingDate }, dashboard });
  } catch (e) {
    return internal(e);
  }
}

const IdParam = z.string().uuid();

/** `.strict()`: o cliente só pode pedir estas duas ações, com estes campos. */
const ChangeBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }).strict(),
  z
    .object({
      action: z.literal("correct"),
      date: z.string().max(10).optional(),
      amountCents: z.number().optional(),
      description: z.string().max(300).optional(),
    })
    .strict(),
]);

/** PATCH /api/transactions/:id: cancela ou corrige um lançamento. */
export async function handleChange(req: Request, id: string, deps: TransactionsHandlerDeps): Promise<Response> {
  if (!IdParam.safeParse(id).success) return json({ error: "invalid_id", message: "Identificador inválido." }, 400);

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return json({ error: "too_large", message: "Pedido grande demais." }, 413);
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "invalid_json", message: "Envie um JSON válido." }, 400);
  }
  const parsed = ChangeBody.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return json({ error: "invalid_body", message: "Dados inválidos.", issues }, 400);
  }

  try {
    const profile = await loadProfile(deps);
    if (!profile) return json(NO_PROFILE, 503);
    const outcome =
      parsed.data.action === "cancel"
        ? await cancelTransaction({ profileId: profile.id, id }, { transactions: deps.transactions })
        : await correctTransaction(
            { profileId: profile.id, id, date: parsed.data.date, amountCents: parsed.data.amountCents, description: parsed.data.description },
            { transactions: deps.transactions, today: deps.clock.today() },
          );
    switch (outcome.status) {
      case "updated":
        return json({ status: "updated", transaction: view(outcome.transaction) });
      case "not_found":
        return json({ error: "not_found", message: "Lançamento não encontrado." }, 404);
      case "conflict":
        return json({ error: "conflict", message: outcome.message }, 409);
      case "invalid":
        return json({ error: outcome.code, message: outcome.message }, 422);
    }
  } catch (e) {
    return internal(e);
  }
}
