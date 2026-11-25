import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixedClock } from "@/server/clock";
import { InMemoryProfilesRepo } from "@/server/extraction/memory";
import { InMemoryTransactionsRepo } from "@/server/transactions/memory";
import { handleReport } from "./report-handler";

async function setup(profile: string | null = "p1") {
  const transactions = new InMemoryTransactionsRepo();
  await transactions.insert({
    profileId: "p1",
    documentId: null,
    date: "2026-05-10",
    issueDate: null,
    amountCents: 1_250_00,
    kind: "receita",
    source: "manual",
    status: "confirmada",
    counterpartyTaxId: null,
    accessKey: null,
    description: "=CMD()",
    confidence: null,
  });
  return { profiles: new InMemoryProfilesRepo(profile), transactions, clock: fixedClock("2026-11-24T15:00:00Z") };
}

describe("GET /api/report", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => errorSpy.mockRestore());

  it("devolve o CSV como download, sem cache e com o tipo travado", async () => {
    const res = await handleReport(await setup());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="teto-lancamentos-2026.csv"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const text = await res.text();
    expect(text).toContain("2026-05-10;Receita;1250,00;confirmada;manual;'=CMD()");
  });

  it("responde 503 sem cadastro", async () => {
    expect((await handleReport(await setup(null))).status).toBe(503);
  });

  it("não devolve o erro interno ao cliente", async () => {
    const deps = await setup();
    deps.transactions.listByYear = async () => {
      throw new Error("senha do banco na string 10.0.0.9");
    };
    const res = await handleReport(deps);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("10.0.0.9");
  });
});
