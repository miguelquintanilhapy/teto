import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEI_CONFIG as cfg,
  accumulatedRevenue,
  annualLimitFor,
  classifyRisk,
  estimateOverrunCost,
  rulesFor,
  toleranceLimitFor,
  type Transaction,
} from "./index";

const LIMIT = 81_000_00;

describe("annualLimitFor", () => {
  it("usa o limite cheio em anos completos", () => {
    expect(annualLimitFor("2024-05-10", 2026, cfg)).toBe(LIMIT);
    expect(annualLimitFor(null, 2026, cfg)).toBe(LIMIT);
  });

  it("é proporcional no ano de abertura, contando o mês de abertura", () => {
    expect(annualLimitFor("2026-03-15", 2026, cfg)).toBe(67_500_00); // 10 meses
    expect(annualLimitFor("2026-01-02", 2026, cfg)).toBe(LIMIT); // 12 meses
    expect(annualLimitFor("2026-12-31", 2026, cfg)).toBe(6_750_00); // 1 mês
  });

  it("é zero antes da abertura", () => {
    expect(annualLimitFor("2027-02-01", 2026, cfg)).toBe(0);
  });
});

describe("rulesFor", () => {
  it("usa o padrão quando o ano não tem diferenças", () => {
    expect(rulesFor(2026)).toEqual(cfg);
    expect(rulesFor(2031)).toEqual(cfg);
  });

  it("aplica só as diferenças do ano e não altera o padrão", () => {
    const table = { 2027: { annualLimitCents: 130_000_00 } };
    expect(rulesFor(2027, table).annualLimitCents).toBe(130_000_00);
    expect(rulesFor(2027, table).dasDueDay).toBe(cfg.dasDueDay);
    expect(rulesFor(2026, table).annualLimitCents).toBe(81_000_00);
    expect(cfg.annualLimitCents).toBe(81_000_00);
  });
});

describe("toleranceLimitFor", () => {
  it("soma 20% ao limite", () => {
    expect(toleranceLimitFor(LIMIT, 0.2)).toBe(97_200_00);
  });
});

describe("accumulatedRevenue", () => {
  const tx = (over: Partial<Transaction>): Transaction => ({
    id: "t",
    date: "2026-02-10",
    amountCents: 1_000_00,
    kind: "receita",
    status: "confirmada",
    ...over,
  });

  it("soma só receitas confirmadas do ano (pendentes e canceladas ficam de fora)", () => {
    const txs = [
      tx({ id: "a" }),
      tx({ id: "b", status: "pendente" }),
      tx({ id: "b2", status: "cancelada" }),
      tx({ id: "c", kind: "despesa" }),
      tx({ id: "d", date: "2025-12-31" }),
      tx({ id: "e", amountCents: 500_00 }),
    ];
    expect(accumulatedRevenue(txs, 2026)).toBe(1_500_00);
  });

  it("respeita a data limite (inclusive)", () => {
    const txs = [tx({ id: "a", date: "2026-02-10" }), tx({ id: "b", date: "2026-02-11" })];
    expect(accumulatedRevenue(txs, 2026, "2026-02-10")).toBe(1_000_00);
  });
});

describe("classifyRisk", () => {
  it.each([
    [0, "ok"],
    [64_799_99, "ok"],
    [64_800_00, "attention"], // exatamente 80%
    [72_900_00, "critical"], // exatamente 90%
    [81_000_00, "critical"], // exatamente no limite ainda não estourou
    [81_000_01, "over_tolerance"],
    [97_200_00, "over_tolerance"], // exatamente +20%
    [97_200_01, "over_retroactive"],
  ])("acumulado %i centavos -> %s", (acc, band) => {
    expect(classifyRisk(acc, LIMIT, cfg)).toBe(band);
  });

  it("trata limite zero (antes da abertura)", () => {
    expect(classifyRisk(0, 0, cfg)).toBe("ok");
    expect(classifyRisk(1, 0, cfg)).toBe("over_retroactive");
  });
});

describe("estimateOverrunCost", () => {
  it("é zero dentro do limite", () => {
    expect(estimateOverrunCost(50_000_00, LIMIT, cfg).kind).toBe("none");
  });

  it("aplica a alíquota só sobre o excedente na tolerância", () => {
    const c = estimateOverrunCost(91_000_00, LIMIT, { ...cfg, excessTaxRate: 0.1 });
    expect(c).toMatchObject({ kind: "excess_das", estimatedCents: 1_000_00, isEstimate: true });
  });

  it("aplica sobre toda a receita no estouro retroativo", () => {
    const c = estimateOverrunCost(100_000_00, LIMIT, { ...cfg, retroactiveTaxRate: 0.1 });
    expect(c).toMatchObject({ kind: "retroactive", estimatedCents: 10_000_00 });
  });
});
