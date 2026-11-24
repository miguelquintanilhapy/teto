import { describe, expect, it } from "vitest";
import { accessKeyCheckDigit } from "@/core";
import { InMemoryTransactionsRepo } from "./memory";
import { confirmTransaction, toCore, type ConfirmInput } from "./service";

const MEI = "11222333000181";
const PROFILE = { id: "p1", name: "Doces da Marta MEI", taxId: MEI, openingDate: "2026-03-01" };
const CLIENT_CNPJ = "12.345.678/0001-95";
const SUPPLIER_CNPJ = "34.567.890/0001-30";
const TODAY = "2026-11-24";
// chave de 44 dígitos com dígito verificador válido (calculado, não copiado)
const KEY_BASE = "3526051122233300018155001000000201101591719";
const KEY = KEY_BASE + accessKeyCheckDigit(KEY_BASE);

const base = (over: Partial<ConfirmInput> = {}): ConfirmInput => ({
  profileId: "p1",
  date: "2026-05-10",
  amountCents: 1_250_00,
  issuerTaxId: MEI,
  recipientTaxId: CLIENT_CNPJ,
  source: "nota",
  description: "Doces para festa",
  ...over,
});

const run = (input: ConfirmInput, repo = new InMemoryTransactionsRepo()) =>
  confirmTransaction(input, { transactions: repo, profile: PROFILE, today: TODAY }).then((outcome) => ({ outcome, repo }));

describe("confirmTransaction: direção decidida pelo código", () => {
  it("é receita quando o MEI é o emissor, e a outra parte é o destinatário", async () => {
    const { outcome, repo } = await run(base());
    expect(outcome.status).toBe("created");
    if (outcome.status !== "created") return;
    expect(outcome.transaction).toMatchObject({
      kind: "receita",
      status: "confirmada",
      counterpartyTaxId: "12345678000195",
      amountCents: 1_250_00,
    });
    expect(repo.events).toEqual([
      { transactionId: outcome.transaction.id, action: "confirmed", changes: { kind: "receita", derivedKind: "receita", source: "nota" } },
    ]);
  });

  it("é despesa quando o MEI é o destinatário, e a outra parte é o emissor", async () => {
    const { outcome } = await run(base({ issuerTaxId: SUPPLIER_CNPJ, recipientTaxId: MEI }));
    expect(outcome).toMatchObject({ status: "created", transaction: { kind: "despesa", counterpartyTaxId: "34567890000130" } });
  });

  it("pede o tipo ao usuário quando o código não consegue derivar", async () => {
    const r = await run(base({ issuerTaxId: SUPPLIER_CNPJ, recipientTaxId: CLIENT_CNPJ }));
    expect(r.outcome).toMatchObject({ status: "invalid", code: "direction_required" });
    expect(r.repo.rows).toHaveLength(0);
  });

  it("aceita a escolha explícita do usuário quando a direção é indefinida", async () => {
    const { outcome } = await run(base({ issuerTaxId: null, recipientTaxId: null, kind: "receita" }));
    expect(outcome).toMatchObject({ status: "created", transaction: { kind: "receita", counterpartyTaxId: null } });
  });

  it("registra no histórico quando o usuário contraria a derivação do código", async () => {
    const { outcome, repo } = await run(base({ kind: "despesa" })); // código derivaria receita
    expect(outcome).toMatchObject({ status: "created", transaction: { kind: "despesa" } });
    expect(repo.events[0]!.changes).toMatchObject({ kind: "despesa", derivedKind: "receita" });
  });
});

describe("confirmTransaction: validação", () => {
  it.each([
    [{ amountCents: 0 }, "invalid_amount"],
    [{ amountCents: -5 }, "invalid_amount"],
    [{ amountCents: 12.5 }, "invalid_amount"],
    [{ amountCents: 1_000_000_001 }, "invalid_amount"],
    [{ date: "2026-02-30" }, "invalid_date"],
    [{ date: "1999-12-31" }, "invalid_date"],
    [{ date: "26/05/2026" }, "invalid_date"],
    [{ date: "2026-12-31" }, "future_date"],
    [{ issueDate: "2026-13-01" }, "invalid_date"],
    [{ issuerTaxId: "11.222.333/0001-82" }, "invalid_tax_id"],
    [{ recipientTaxId: "123" }, "invalid_tax_id"],
    [{ accessKey: "123" }, "invalid_access_key"],
    [{ accessKey: KEY.slice(0, 43) + ((Number(KEY[43]) + 1) % 10) }, "invalid_access_key"],
  ] as const)("recusa %j com %s, sem gravar nada", async (over, code) => {
    const r = await run(base(over as Partial<ConfirmInput>));
    expect(r.outcome).toMatchObject({ status: "invalid", code });
    expect(r.repo.rows).toHaveLength(0);
  });

  it("aceita data de amanhã (diferença de fuso) mas não de depois de amanhã", async () => {
    expect((await run(base({ date: "2026-11-25" }))).outcome.status).toBe("created");
    expect((await run(base({ date: "2026-11-26" }))).outcome).toMatchObject({ code: "future_date" });
  });

  it("aceita chave com espaços e a grava só com dígitos; campos opcionais em branco viram nulos", async () => {
    const spaced = KEY.replace(/(\d{4})(?=\d)/g, "$1 ");
    const { outcome } = await run(base({ accessKey: spaced, issueDate: "  ", description: "   x   " }));
    expect(outcome).toMatchObject({ status: "created", transaction: { accessKey: KEY, issueDate: null, description: "x" } });
  });

  it("limita a descrição a 300 caracteres", async () => {
    const { outcome } = await run(base({ description: "a".repeat(500) }));
    if (outcome.status !== "created") throw new Error("esperava created");
    expect(outcome.transaction.description).toHaveLength(300);
  });
});

describe("confirmTransaction: idempotência e consistência", () => {
  it("o mesmo documento nunca vira dois lançamentos", async () => {
    const repo = new InMemoryTransactionsRepo();
    const first = await run(base({ documentId: "doc-1" }), repo);
    const second = await run(base({ documentId: "doc-1", amountCents: 9_999_00 }), repo);
    expect(first.outcome.status).toBe("created");
    expect(second.outcome.status).toBe("duplicate");
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]!.amountCents).toBe(1_250_00); // não sobrescreve
  });

  it("a mesma nota (chave de acesso) nunca vira dois lançamentos, mesmo vindo de documentos diferentes", async () => {
    const repo = new InMemoryTransactionsRepo();
    await run(base({ documentId: "doc-1", accessKey: KEY }), repo);
    const again = await run(base({ documentId: "doc-2", accessKey: KEY }), repo);
    expect(again.outcome.status).toBe("duplicate");
    expect(repo.rows).toHaveLength(1);
  });

  it("confirmações simultâneas da mesma nota: a segunda recebe o existente", async () => {
    const repo = new InMemoryTransactionsRepo();
    const original = repo.findByAccessKey.bind(repo);
    // simula a corrida: a verificação inicial não vê nada, mas a inserção encontra a primeira
    await repo.insert({ ...base({ accessKey: KEY }), profileId: "p1", documentId: null, date: "2026-05-10", issueDate: null, kind: "receita", status: "confirmada", counterpartyTaxId: null, accessKey: KEY, description: "", confidence: null, amountCents: 1 } as never);
    let first = true;
    repo.findByAccessKey = async (p, k) => {
      if (first) {
        first = false;
        return null;
      }
      return original(p, k);
    };
    const { outcome } = await run(base({ accessKey: KEY }), repo);
    expect(outcome.status).toBe("duplicate");
  });

  it("sem histórico não há lançamento: desfaz a inserção se o registro do evento falhar", async () => {
    const repo = new InMemoryTransactionsRepo();
    repo.failEvents = true;
    await expect(run(base(), repo)).rejects.toThrow("histórico indisponível");
    expect(repo.rows).toHaveLength(0);
  });

  it("converte para a visão mínima do núcleo", async () => {
    const { outcome } = await run(base());
    if (outcome.status !== "created") throw new Error("esperava created");
    expect(toCore(outcome.transaction)).toEqual({
      id: outcome.transaction.id,
      date: "2026-05-10",
      amountCents: 1_250_00,
      kind: "receita",
      status: "confirmada",
    });
  });
});
