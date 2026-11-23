import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEI_CONFIG as cfg,
  daysUntilDas,
  dueAlertKinds,
  newAlerts,
  nextDasDueDate,
  projectYear,
  simulateExtraRevenue,
  type AlertKind,
  type Transaction,
} from "./index";

const LIMIT = 81_000_00;

const rev = (id: string, date: string, amountCents: number): Transaction => ({
  id,
  date,
  amountCents,
  kind: "receita",
  status: "confirmada",
});

describe("projectYear", () => {
  it("projeta o estouro no ritmo atual", () => {
    // 30.000,00 em 100 dias (01/01 a 10/04) => 300,00/dia
    // faltam 51.000 p/ o limite => 170 dias => 27/09; 67.200 p/ +20% => 224 dias => 20/11
    const p = projectYear({
      transactions: [rev("a", "2026-04-10", 30_000_00)],
      today: "2026-04-10",
      openingDate: null,
      limitCents: LIMIT,
      cfg,
    });
    expect(p.accumulatedCents).toBe(30_000_00);
    expect(p.dailyRateCents).toBeCloseTo(30_000_00 / 100);
    expect(p.limitCrossing).toEqual({ status: "projected", date: "2026-09-27" });
    expect(p.toleranceCrossing).toEqual({ status: "projected", date: "2026-11-20" });
    expect(p.projectedYearEndCents).toBe(Math.round((30_000_00 / 100) * 365));
  });

  it("informa que o limite já foi ultrapassado", () => {
    const p = projectYear({
      transactions: [rev("a", "2026-03-01", 85_000_00)],
      today: "2026-03-01",
      openingDate: null,
      limitCents: LIMIT,
      cfg,
    });
    expect(p.limitCrossing).toEqual({ status: "reached" });
    expect(p.toleranceCrossing.status).not.toBe("reached");
  });

  it("sem receita não há estouro previsto", () => {
    const p = projectYear({
      transactions: [],
      today: "2026-06-01",
      openingDate: null,
      limitCents: LIMIT,
      cfg,
    });
    expect(p.limitCrossing).toEqual({ status: "not_this_year" });
    expect(p.projectedYearEndCents).toBe(0);
  });

  it("no ano de abertura conta os dias só desde a abertura", () => {
    const p = projectYear({
      transactions: [rev("a", "2026-03-10", 10_000_00)],
      today: "2026-03-10",
      openingDate: "2026-03-01",
      limitCents: 67_500_00,
      cfg,
    });
    expect(p.dailyRateCents).toBeCloseTo(10_000_00 / 10); // 10 dias, não 69
  });
});

describe("simulateExtraRevenue", () => {
  it("mostra o custo adicional ao cruzar a faixa", () => {
    const r = simulateExtraRevenue(75_000_00, 10_000_00, LIMIT, { ...cfg, excessTaxRate: 0.1 });
    expect(r.before.band).toBe("critical");
    expect(r.after.band).toBe("over_tolerance");
    expect(r.changesBand).toBe(true);
    expect(r.additionalCostCents).toBe(400_00); // 10% de 4.000 de excedente
    expect(r.headroomBeforeCents).toBe(6_000_00);
  });

  it("não custa nada se a venda cabe no limite", () => {
    const r = simulateExtraRevenue(10_000_00, 5_000_00, LIMIT, cfg);
    expect(r.additionalCostCents).toBe(0);
    expect(r.changesBand).toBe(false);
  });

  it("rejeita valores inválidos", () => {
    expect(() => simulateExtraRevenue(0, -1, LIMIT, cfg)).toThrow(RangeError);
    expect(() => simulateExtraRevenue(0, 1.5, LIMIT, cfg)).toThrow(RangeError);
  });
});

describe("DAS", () => {
  it("antes e no dia do vencimento aponta para o mês corrente", () => {
    expect(nextDasDueDate("2026-05-10", 20)).toBe("2026-05-20");
    expect(nextDasDueDate("2026-05-20", 20)).toBe("2026-05-20");
  });

  it("depois do vencimento aponta para o mês seguinte, inclusive na virada do ano", () => {
    expect(nextDasDueDate("2026-05-21", 20)).toBe("2026-06-20");
    expect(nextDasDueDate("2026-12-25", 20)).toBe("2027-01-20");
  });

  it("conta os dias até o vencimento", () => {
    expect(daysUntilDas("2026-05-15", 20)).toBe(5);
  });
});

describe("alertas", () => {
  it("acumula conforme a situação piora", () => {
    expect(dueAlertKinds(50_000_00, LIMIT, cfg)).toEqual([]);
    expect(dueAlertKinds(65_000_00, LIMIT, cfg)).toEqual(["threshold_warning"]);
    expect(dueAlertKinds(75_000_00, LIMIT, cfg)).toEqual(["threshold_warning", "threshold_critical"]);
    expect(dueAlertKinds(90_000_00, LIMIT, cfg)).toContain("over_limit");
    expect(dueAlertKinds(100_000_00, LIMIT, cfg)).toContain("over_tolerance");
  });

  it("é idempotente: não repete o que já foi disparado", () => {
    const fired = new Set<AlertKind>(["threshold_warning"]);
    expect(newAlerts(75_000_00, LIMIT, fired, cfg)).toEqual(["threshold_critical"]);
    expect(newAlerts(65_000_00, LIMIT, fired, cfg)).toEqual([]);
  });
});
