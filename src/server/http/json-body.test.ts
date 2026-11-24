import { describe, expect, it } from "vitest";
import { fixedClock } from "@/server/clock";
import { InMemoryProfilesRepo } from "@/server/extraction/memory";
import { InMemoryTransactionsRepo } from "@/server/transactions/memory";
import { readJsonBody } from "./json-body";
import { handleConfirm } from "./transactions-handler";

const req = (body: string, headers: Record<string, string> = { "content-type": "application/json" }) =>
  new Request("http://localhost/api/x", { method: "POST", headers, body });

describe("readJsonBody", () => {
  it("lê JSON válido", async () => {
    const r = await readJsonBody(req('{"a":1}'), 100);
    expect(r).toEqual({ ok: true, value: { a: 1 } });
  });

  it("aceita application/json com charset", async () => {
    const r = await readJsonBody(req("{}", { "content-type": "application/json; charset=utf-8" }), 100);
    expect(r.ok).toBe(true);
  });

  it("recusa text/plain (o único tipo que outro site consegue enviar sem pedir permissão)", async () => {
    for (const type of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data"]) {
      const r = await readJsonBody(req("{}", { "content-type": type }), 100);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(415);
    }
    const none = await readJsonBody(req("{}", {}), 100);
    expect(none.ok === false && none.response.status).toBe(415);
  });

  it("confere o tamanho de verdade, mesmo sem Content-Length", async () => {
    const big = JSON.stringify({ x: "a".repeat(500) });
    const r = await readJsonBody(req(big), 100);
    expect(r.ok === false && r.response.status).toBe(413);
  });

  it("conta bytes, e não caracteres (acentos e emoji pesam mais)", async () => {
    const r = await readJsonBody(req(JSON.stringify({ x: "é".repeat(60) })), 100);
    expect(r.ok === false && r.response.status).toBe(413);
  });

  it("responde 400 para JSON quebrado", async () => {
    const r = await readJsonBody(req("{quebrado"), 100);
    expect(r.ok === false && r.response.status).toBe(400);
  });

  it("os erros nunca ficam em cache", async () => {
    const r = await readJsonBody(req("{}", { "content-type": "text/plain" }), 100);
    expect(r.ok === false && r.response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("handlers usam o leitor seguro", () => {
  it("POST /api/transactions com text/plain é recusado antes de qualquer gravação", async () => {
    const transactions = new InMemoryTransactionsRepo();
    const deps = { profiles: new InMemoryProfilesRepo("p1"), transactions, clock: fixedClock("2026-11-24T15:00:00Z") };
    const res = await handleConfirm(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ date: "2026-05-10", amountCents: 100_000, source: "manual", kind: "receita" }),
      }),
      deps,
    );
    expect(res.status).toBe(415);
    expect(transactions.rows).toHaveLength(0);
  });
});
