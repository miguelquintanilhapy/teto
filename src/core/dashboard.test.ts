import { describe, expect, it } from "vitest";
import { buildDashboard, type Transaction } from "./index";

const tx = (over: Partial<Transaction> & { id: string }): Transaction => ({
  date: "2026-04-10",
  amountCents: 10_000_00,
  kind: "receita",
  status: "confirmada",
  ...over,
});

describe("buildDashboard", () => {
  it("resume o ano de um MEI aberto em março (limite proporcional de 10 meses)", () => {
    const d = buildDashboard({
      transactions: [tx({ id: "a", amountCents: 30_000_00 }), tx({ id: "b", date: "2026-05-02", amountCents: 20_000_00 })],
      today: "2026-06-30",
      openingDate: "2026-03-15",
    });
    expect(d.year).toBe(2026);
    expect(d.limitCents).toBe(67_500_00); // 6.750 x 10 meses
    expect(d.toleranceLimitCents).toBe(81_000_00);
    expect(d.accumulatedCents).toBe(50_000_00);
    expect(d.usedRatio).toBeCloseTo(50_000_00 / 67_500_00);
    expect(d.headroomCents).toBe(17_500_00);
    expect(d.band).toBe("ok"); // 74% do limite: ainda abaixo dos 80%
  });

  it("não conta pendentes, canceladas, despesas nem receitas de outro ano ou do futuro", () => {
    const d = buildDashboard({
      transactions: [
        tx({ id: "ok", amountCents: 1_000_00 }),
        tx({ id: "pend", status: "pendente", amountCents: 9_000_00 }),
        tx({ id: "canc", status: "cancelada", amountCents: 9_000_00 }),
        tx({ id: "desp", kind: "despesa", amountCents: 9_000_00 }),
        tx({ id: "antes", date: "2025-12-31", amountCents: 9_000_00 }),
        tx({ id: "depois", date: "2026-07-01", amountCents: 9_000_00 }),
      ],
      today: "2026-06-30",
      openingDate: null,
    });
    expect(d.accumulatedCents).toBe(1_000_00);
    expect(d.pendingCount).toBe(1);
    expect(d.confirmedRevenueCount).toBe(1);
  });

  it("classifica a faixa de risco e estima o custo do estouro", () => {
    const at = (cents: number) =>
      buildDashboard({ transactions: [tx({ id: "a", amountCents: cents })], today: "2026-12-01", openingDate: null });
    expect(at(10_000_00).band).toBe("ok");
    expect(at(65_000_00).band).toBe("attention");
    expect(at(75_000_00).band).toBe("critical");
    expect(at(90_000_00)).toMatchObject({ band: "over_tolerance", cost: { kind: "excess_das", isEstimate: true } });
    expect(at(100_000_00)).toMatchObject({ band: "over_retroactive", cost: { kind: "retroactive" } });
    expect(at(100_000_00).headroomCents).toBe(0);
  });

  it("devolve os alertas justificados e o próximo vencimento do DAS", () => {
    const d = buildDashboard({
      transactions: [tx({ id: "a", amountCents: 75_000_00 })],
      today: "2026-06-25",
      openingDate: null,
    });
    expect(d.alerts).toEqual(["threshold_warning", "threshold_critical"]);
    expect(d.das).toEqual({ nextDueDate: "2026-07-20", daysUntil: 25 });
  });

  it("projeta quando o limite será ultrapassado no ritmo atual", () => {
    const d = buildDashboard({
      transactions: [tx({ id: "a", date: "2026-04-10", amountCents: 30_000_00 })],
      today: "2026-04-10",
      openingDate: null,
    });
    expect(d.projection.limitCrossing).toEqual({ status: "projected", date: "2026-09-27" });
  });

  it("usa as regras do ano de hoje: em 2027 o limite é de R$ 110.000", () => {
    const d = buildDashboard({ transactions: [], today: "2027-02-10", openingDate: null });
    expect(d.limitCents).toBe(110_000_00);
  });

  it("sem receitas, tudo zerado e sem estouro previsto", () => {
    const d = buildDashboard({ transactions: [], today: "2026-02-10", openingDate: null });
    expect(d).toMatchObject({ accumulatedCents: 0, usedRatio: 0, band: "ok", alerts: [], pendingCount: 0 });
    expect(d.projection.limitCrossing).toEqual({ status: "not_this_year" });
  });

  it("MEI aberto em setembro tem limite proporcional de 4 meses", () => {
    const d = buildDashboard({ transactions: [], today: "2026-10-10", openingDate: "2026-09-01" });
    expect(d.limitCents).toBe(27_000_00); // 6.750 x 4 meses
  });

  it("antes da abertura (abre só no ano seguinte) o limite é zero e a razão não vira NaN", () => {
    const d = buildDashboard({ transactions: [], today: "2026-12-01", openingDate: "2027-02-01" });
    expect(d.limitCents).toBe(0);
    expect(d.usedRatio).toBe(0);
    expect(Number.isFinite(d.usedRatio)).toBe(true);
  });
});
