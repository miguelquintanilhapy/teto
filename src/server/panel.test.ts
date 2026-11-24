import { describe, expect, it } from "vitest";
import { fixedClock } from "@/server/clock";
import { InMemoryProfilesRepo } from "@/server/extraction/memory";
import { InMemoryTransactionsRepo } from "@/server/transactions/memory";
import { loadPanel } from "./panel";

function setup(profileId: string | null = "p1") {
  const transactions = new InMemoryTransactionsRepo();
  const deps = {
    profiles: new InMemoryProfilesRepo(profileId, { openingDate: "2026-03-01" }),
    transactions,
    clock: fixedClock("2026-11-24T15:00:00Z"),
  };
  return { deps, transactions };
}

const row = (over: Partial<Parameters<InMemoryTransactionsRepo["insert"]>[0]> = {}) => ({
  profileId: "p1",
  documentId: null,
  date: "2026-05-10",
  issueDate: null,
  amountCents: 1_000_00,
  kind: "receita" as const,
  source: "manual" as const,
  status: "confirmada" as const,
  counterpartyTaxId: null,
  accessKey: null,
  description: "Bolo",
  confidence: null,
  ...over,
});

describe("loadPanel", () => {
  it("devolve null quando o perfil de demonstração não existe", async () => {
    const { deps } = setup(null);
    expect(await loadPanel(deps)).toBeNull();
  });

  it("junta resumo, série mensal e lançamentos, dos mais novos para os mais antigos", async () => {
    const { deps, transactions } = setup();
    await transactions.insert(row({ date: "2026-05-10", amountCents: 1_000_00 }));
    await transactions.insert(row({ date: "2026-11-05", amountCents: 2_500_00, description: "Torta" }));
    await transactions.insert(row({ date: "2026-11-06", amountCents: 900_00, status: "pendente" }));

    const p = await loadPanel(deps);
    expect(p).not.toBeNull();
    expect(p!.today).toBe("2026-11-24");
    expect(p!.dashboard.accumulatedCents).toBe(3_500_00);
    expect(p!.dashboard.pendingCount).toBe(1);
    expect(p!.months[4]).toBe(1_000_00);
    expect(p!.months[10]).toBe(2_500_00);
    expect(p!.transactions.map((t) => t.date)).toEqual(["2026-11-06", "2026-11-05", "2026-05-10"]);
  });

  it("não expõe identificadores internos do banco", async () => {
    const { deps, transactions } = setup();
    await transactions.insert(row());
    const p = await loadPanel(deps);
    expect(Object.keys(p!.transactions[0]!).sort()).toEqual(
      ["amountCents", "counterpartyTaxId", "date", "description", "id", "kind", "source", "status"].sort(),
    );
  });
});
