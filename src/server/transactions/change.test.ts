import { describe, expect, it } from "vitest";
import { InMemoryTransactionsRepo } from "./memory";
import { cancelTransaction, correctTransaction, toCore, type TransactionRecord } from "./service";

const TODAY = "2026-11-24";

async function seed(over: Partial<Omit<TransactionRecord, "id">> = {}) {
  const repo = new InMemoryTransactionsRepo();
  const row = await repo.insert({
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
    description: "Doces para festa",
    confidence: 0.9,
    ...over,
  });
  return { repo, row };
}

describe("cancelTransaction", () => {
  it("cancela, registra o histórico e tira o valor do cálculo do limite", async () => {
    const { repo, row } = await seed();
    const r = await cancelTransaction({ profileId: "p1", id: row.id }, { transactions: repo });
    expect(r.status).toBe("updated");
    if (r.status !== "updated") return;
    expect(r.transaction.status).toBe("cancelada");
    expect(repo.events).toEqual([
      { transactionId: row.id, action: "cancelled", changes: { status: { from: "confirmada", to: "cancelada" } } },
    ]);
    expect(toCore(r.transaction).status).toBe("cancelada"); // só "confirmada" soma no limite
  });

  it("é idempotente: cancelar de novo não cria outro evento", async () => {
    const { repo, row } = await seed();
    await cancelTransaction({ profileId: "p1", id: row.id }, { transactions: repo });
    const again = await cancelTransaction({ profileId: "p1", id: row.id }, { transactions: repo });
    expect(again.status).toBe("updated");
    expect(repo.events).toHaveLength(1);
  });

  it("não encontra lançamento de outro perfil nem id inexistente", async () => {
    const { repo, row } = await seed();
    expect((await cancelTransaction({ profileId: "outro", id: row.id }, { transactions: repo })).status).toBe("not_found");
    expect((await cancelTransaction({ profileId: "p1", id: "nao-existe" }, { transactions: repo })).status).toBe("not_found");
  });

  it("desfaz o cancelamento se o histórico falhar, para não ficar mudança sem rastro", async () => {
    const { repo, row } = await seed();
    repo.failEvents = true;
    await expect(cancelTransaction({ profileId: "p1", id: row.id }, { transactions: repo })).rejects.toThrow();
    expect((await repo.findById("p1", row.id))?.status).toBe("confirmada");
  });
});

describe("correctTransaction", () => {
  const run = (repo: InMemoryTransactionsRepo, id: string, input: Partial<Parameters<typeof correctTransaction>[0]>) =>
    correctTransaction({ profileId: "p1", id, ...input }, { transactions: repo, today: TODAY });

  it("corrige valor, data e descrição e guarda o antes e o depois", async () => {
    const { repo, row } = await seed();
    const r = await run(repo, row.id, { amountCents: 1_300_00, date: "2026-05-12", description: "  Doces e bolo  " });
    expect(r.status).toBe("updated");
    if (r.status !== "updated") return;
    expect(r.transaction).toMatchObject({ amountCents: 1_300_00, date: "2026-05-12", description: "Doces e bolo" });
    expect(repo.events[0]).toMatchObject({
      action: "corrected",
      changes: {
        amountCents: { from: 1_250_00, to: 1_300_00 },
        date: { from: "2026-05-10", to: "2026-05-12" },
        description: { from: "Doces para festa", to: "Doces e bolo" },
      },
    });
  });

  it("não deixa corrigir um lançamento cancelado", async () => {
    const { repo, row } = await seed({ status: "cancelada" });
    const r = await run(repo, row.id, { amountCents: 100 });
    expect(r.status).toBe("conflict");
  });

  it("aplica as mesmas regras da confirmação: valor, data válida e sem data futura", async () => {
    const { repo, row } = await seed();
    expect(await run(repo, row.id, { amountCents: 0 })).toMatchObject({ status: "invalid", code: "invalid_amount" });
    expect(await run(repo, row.id, { amountCents: 10.5 })).toMatchObject({ status: "invalid", code: "invalid_amount" });
    expect(await run(repo, row.id, { date: "2026-02-30" })).toMatchObject({ status: "invalid", code: "invalid_date" });
    expect(await run(repo, row.id, { date: "2026-12-30" })).toMatchObject({ status: "invalid", code: "future_date" });
    expect(repo.events).toHaveLength(0);
  });

  it("avisa quando nada mudou, em vez de gravar um evento vazio", async () => {
    const { repo, row } = await seed();
    const r = await run(repo, row.id, { amountCents: 1_250_00, description: "Doces para festa" });
    expect(r).toMatchObject({ status: "invalid", code: "nothing_to_change" });
    expect(repo.events).toHaveLength(0);
  });

  it("devolve os valores antigos se o histórico falhar", async () => {
    const { repo, row } = await seed();
    repo.failEvents = true;
    await expect(run(repo, row.id, { amountCents: 2_000_00 })).rejects.toThrow();
    expect((await repo.findById("p1", row.id))?.amountCents).toBe(1_250_00);
  });

  it("não encontra lançamento de outro perfil", async () => {
    const { repo, row } = await seed();
    const r = await correctTransaction({ profileId: "outro", id: row.id, amountCents: 100 }, { transactions: repo, today: TODAY });
    expect(r.status).toBe("not_found");
  });
});
