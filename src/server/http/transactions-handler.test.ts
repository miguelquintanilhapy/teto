import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accessKeyCheckDigit } from "@/core";
import { fixedClock } from "@/server/clock";
import { InMemoryProfilesRepo } from "@/server/extraction/memory";
import { InMemoryTransactionsRepo } from "@/server/transactions/memory";
import { handleConfirm, handleDashboard, handleList, type TransactionsHandlerDeps } from "./transactions-handler";

const MEI = "11.222.333/0001-81";
const CLIENT = "12.345.678/0001-95";
const KEY_BASE = "3526051122233300018155001000000201101591719";
const KEY = KEY_BASE + accessKeyCheckDigit(KEY_BASE);

function makeDeps(opts: { profile?: string | null } = {}) {
  const transactions = new InMemoryTransactionsRepo();
  const deps: TransactionsHandlerDeps = {
    profiles: new InMemoryProfilesRepo(opts.profile === undefined ? "p1" : opts.profile, { openingDate: "2026-03-01" }),
    transactions,
    clock: fixedClock("2026-06-30T15:00:00Z"), // 30/06/2026 em Brasília
  };
  return { deps, transactions };
}

const body = (over: Record<string, unknown> = {}) => ({
  date: "2026-05-10",
  amountCents: 1_250_00,
  issuerTaxId: MEI,
  recipientTaxId: CLIENT,
  source: "nota",
  description: "Doces para festa",
  ...over,
});

const post = (b: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/transactions", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof b === "string" ? b : JSON.stringify(b),
  });

describe("POST /api/transactions", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => errorSpy.mockRestore());

  it("confirma e devolve 201 com só o que a interface precisa", async () => {
    const { deps, transactions } = makeDeps();
    const res = await handleConfirm(post(body()), deps);
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json.status).toBe("created");
    expect(json.transaction).toMatchObject({
      kind: "receita",
      status: "confirmada",
      amountCents: 1_250_00,
      counterpartyTaxId: "12345678000195",
    });
    expect(JSON.stringify(json)).not.toMatch(/profileId|profile_id|confidence/);
    expect(transactions.rows).toHaveLength(1);
    expect(transactions.events).toHaveLength(1);
  });

  it("reenviar a mesma nota devolve 200 duplicate, sem criar outra", async () => {
    const { deps, transactions } = makeDeps();
    await handleConfirm(post(body({ accessKey: KEY })), deps);
    const again = await handleConfirm(post(body({ accessKey: KEY, amountCents: 1 })), deps);
    expect(again.status).toBe(200);
    expect((await again.json()).status).toBe("duplicate");
    expect(transactions.rows).toHaveLength(1);
  });

  it("422 com o código do problema nas regras de negócio", async () => {
    const { deps } = makeDeps();
    const res = await handleConfirm(post(body({ amountCents: 0 })), deps);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("invalid_amount");

    const dir = await handleConfirm(post(body({ issuerTaxId: "34.567.890/0001-30" })), deps);
    expect(dir.status).toBe(422);
    expect((await dir.json()).error).toBe("direction_required");
  });

  it("400 para JSON inválido e para corpo com campos errados, sem devolver os valores enviados", async () => {
    const { deps } = makeDeps();
    expect((await handleConfirm(post("{não é json"), deps)).status).toBe(400);

    const res = await handleConfirm(post(body({ source: "SEGREDO-123", amountCents: "caro" })), deps);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(JSON.parse(text).error).toBe("invalid_body");
    expect(text).not.toMatch(/SEGREDO-123|caro/);
  });

  it("recusa campos que o cliente não pode definir (status, perfil, id)", async () => {
    const { deps, transactions } = makeDeps();
    for (const forged of [{ status: "confirmada" }, { profileId: "outro" }, { id: "x" }]) {
      const res = await handleConfirm(post(body(forged)), deps);
      expect(res.status).toBe(400);
    }
    expect(transactions.rows).toHaveLength(0);
  });

  it("413 quando o corpo declarado é grande demais", async () => {
    const { deps } = makeDeps();
    const res = await handleConfirm(post(body(), { "content-length": "999999" }), deps);
    expect(res.status).toBe(413);
  });

  it("503 se o perfil de demonstração não existe", async () => {
    const { deps } = makeDeps({ profile: null });
    const res = await handleConfirm(post(body()), deps);
    expect(res.status).toBe(503);
    expect((await res.json()).message).toMatch(/npm run seed/);
  });

  it("500 genérico em erro inesperado, sem vazar a mensagem interna", async () => {
    const { deps, transactions } = makeDeps();
    transactions.insert = async () => {
      throw new Error("SEGREDO-INTERNO postgres://usuario:senha@host");
    };
    const res = await handleConfirm(post(body()), deps);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toMatch(/SEGREDO-INTERNO|postgres/);
    expect(JSON.parse(text).error).toBe("internal");
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("GET /api/transactions", () => {
  it("lista os lançamentos do ano de hoje por padrão, em ordem de data", async () => {
    const { deps } = makeDeps();
    await handleConfirm(post(body({ date: "2026-05-20", amountCents: 200_00 })), deps);
    await handleConfirm(post(body({ date: "2026-02-01", amountCents: 100_00 })), deps);
    const res = await handleList(new Request("http://localhost/api/transactions"), deps);
    const json = await res.json();
    expect(json.year).toBe(2026);
    expect(json.transactions.map((t: { date: string }) => t.date)).toEqual(["2026-02-01", "2026-05-20"]);
  });

  it("aceita ?year= e recusa ano inválido", async () => {
    const { deps } = makeDeps();
    const other = await handleList(new Request("http://localhost/api/transactions?year=2025"), deps);
    expect((await other.json()).transactions).toEqual([]);
    for (const bad of ["abc", "1999", "2101", "2026.5"]) {
      const res = await handleList(new Request(`http://localhost/api/transactions?year=${bad}`), deps);
      expect(res.status).toBe(400);
    }
  });
});

describe("GET /api/dashboard", () => {
  it("resume o limite proporcional, o acumulado e a faixa de risco", async () => {
    const { deps } = makeDeps();
    await handleConfirm(post(body({ date: "2026-04-10", amountCents: 30_000_00 })), deps);
    await handleConfirm(post(body({ date: "2026-05-10", amountCents: 20_000_00 })), deps);
    const res = await handleDashboard(new Request("http://localhost/api/dashboard"), deps);
    expect(res.status).toBe(200);
    const { today, profile, dashboard: d } = await res.json();
    expect(today).toBe("2026-06-30");
    expect(profile).toEqual({ name: "Doces da Marta MEI", openingDate: "2026-03-01" }); // sem CNPJ
    expect(d).toMatchObject({
      year: 2026,
      limitCents: 67_500_00, // aberto em março: 10 meses
      accumulatedCents: 50_000_00,
      headroomCents: 17_500_00,
      band: "ok",
      pendingCount: 0,
      confirmedRevenueCount: 2,
    });
    expect(d.das).toEqual({ nextDueDate: "2026-07-20", daysUntil: 20 });
  });

  it("pendentes, canceladas e despesas não entram no acumulado", async () => {
    const { deps, transactions } = makeDeps();
    await handleConfirm(post(body({ amountCents: 1_000_00 })), deps);
    const base = {
      profileId: "p1", documentId: null, date: "2026-05-11", issueDate: null, source: "nota" as const,
      counterpartyTaxId: null, accessKey: null, description: "", confidence: null,
    };
    await transactions.insert({ ...base, amountCents: 9_000_00, kind: "receita", status: "pendente" });
    await transactions.insert({ ...base, amountCents: 9_000_00, kind: "receita", status: "cancelada" });
    await transactions.insert({ ...base, amountCents: 9_000_00, kind: "despesa", status: "confirmada" });
    const { dashboard: d } = await (await handleDashboard(new Request("http://localhost/api/dashboard"), deps)).json();
    expect(d.accumulatedCents).toBe(1_000_00);
    expect(d.pendingCount).toBe(1);
  });

  it("503 sem perfil e 500 genérico em erro", async () => {
    expect((await handleDashboard(new Request("http://localhost/api/dashboard"), makeDeps({ profile: null }).deps)).status).toBe(503);

    const { deps, transactions } = makeDeps();
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    transactions.listByYear = async () => {
      throw new Error("falha interna");
    };
    const res = await handleDashboard(new Request("http://localhost/api/dashboard"), deps);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toMatch(/falha interna/);
    spy.mockRestore();
  });
});
