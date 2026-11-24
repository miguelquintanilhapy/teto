import { describe, expect, it } from "vitest";
import { fixedClock } from "@/server/clock";
import { InMemoryProfilesRepo } from "@/server/extraction/memory";
import { InMemoryTransactionsRepo } from "@/server/transactions/memory";
import { handleChange, type TransactionsHandlerDeps } from "./transactions-handler";

async function setup(profile: string | null = "p1") {
  const transactions = new InMemoryTransactionsRepo();
  const deps: TransactionsHandlerDeps = {
    profiles: new InMemoryProfilesRepo(profile, { openingDate: "2026-03-01" }),
    transactions,
    clock: fixedClock("2026-11-24T15:00:00Z"),
  };
  const row = await transactions.insert({
    profileId: "p1",
    documentId: null,
    date: "2026-05-10",
    issueDate: null,
    amountCents: 1_250_00,
    kind: "receita",
    source: "nota",
    status: "confirmada",
    counterpartyTaxId: "12345678000195",
    accessKey: null,
    description: "Doces",
    confidence: null,
  });
  return { deps, transactions, id: row.id };
}

const patch = (body: unknown) =>
  new Request("http://localhost/api/transactions/x", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const UNKNOWN_ID = "7d0a2b52-2f7c-4d3a-9d3e-6c3b5d0c1a11";

describe("PATCH /api/transactions/:id", () => {
  it("cancela e devolve só o que a interface precisa", async () => {
    const { deps, id } = await setup();
    const res = await handleChange(patch({ action: "cancel" }), id, deps);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.status).toBe("updated");
    expect(body.transaction.status).toBe("cancelada");
    expect(body.transaction).not.toHaveProperty("profileId");
  });

  it("corrige valor e descrição", async () => {
    const { deps, id } = await setup();
    const res = await handleChange(patch({ action: "correct", amountCents: 1_300_00, description: "Doces e bolo" }), id, deps);
    expect(res.status).toBe(200);
    expect((await res.json()).transaction).toMatchObject({ amountCents: 1_300_00, description: "Doces e bolo" });
  });

  it("recusa campo desconhecido: o cliente não define status, tipo, perfil nem id", async () => {
    const { deps, id } = await setup();
    for (const extra of [{ status: "confirmada" }, { kind: "despesa" }, { profileId: "p2" }, { id: "x" }]) {
      const res = await handleChange(patch({ action: "correct", amountCents: 100, ...extra }), id, deps);
      expect(res.status).toBe(400);
    }
    expect((await handleChange(patch({ action: "apagar" }), id, deps)).status).toBe(400);
    expect((await handleChange(patch({ action: "cancel", status: "x" }), id, deps)).status).toBe(400);
  });

  it("recusa identificador inválido e JSON quebrado", async () => {
    const { deps } = await setup();
    expect((await handleChange(patch({ action: "cancel" }), "nao-e-uuid", deps)).status).toBe(400);
    expect((await handleChange(patch("{quebrado"), UNKNOWN_ID, deps)).status).toBe(400);
  });

  it("responde 404 para lançamento inexistente", async () => {
    const { deps } = await setup();
    expect((await handleChange(patch({ action: "cancel" }), UNKNOWN_ID, deps)).status).toBe(404);
  });

  it("responde 409 ao corrigir um lançamento cancelado e 422 ao validar", async () => {
    const { deps, id } = await setup();
    expect((await handleChange(patch({ action: "correct", amountCents: 0 }), id, deps)).status).toBe(422);
    await handleChange(patch({ action: "cancel" }), id, deps);
    expect((await handleChange(patch({ action: "correct", amountCents: 500 }), id, deps)).status).toBe(409);
  });

  it("responde 503 sem perfil de demonstração", async () => {
    const { deps, id } = await setup(null);
    expect((await handleChange(patch({ action: "cancel" }), id, deps)).status).toBe(503);
  });

  it("o histórico guarda o que mudou", async () => {
    const { deps, transactions, id } = await setup();
    await handleChange(patch({ action: "correct", description: "Outra" }), id, deps);
    const events = await transactions.listEvents(id);
    expect(events.map((e) => e.action)).toEqual(["corrected"]);
  });
});
