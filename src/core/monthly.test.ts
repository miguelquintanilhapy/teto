import { describe, expect, it } from "vitest";
import { monthlyRevenue, quarterlyRevenue, type Transaction } from "./index";

const tx = (over: Partial<Transaction> & { id: string }): Transaction => ({
  date: "2026-04-10",
  amountCents: 1_000_00,
  kind: "receita",
  status: "confirmada",
  ...over,
});

describe("monthlyRevenue", () => {
  it("soma a receita confirmada de cada mês", () => {
    const m = monthlyRevenue(
      [tx({ id: "a" }), tx({ id: "b", date: "2026-04-30", amountCents: 500_00 }), tx({ id: "c", date: "2026-11-05" })],
      2026,
    );
    expect(m).toHaveLength(12);
    expect(m[3]).toBe(1_500_00);
    expect(m[10]).toBe(1_000_00);
    expect(m[0]).toBe(0);
  });

  it("ignora pendentes, canceladas, despesas, outro ano e o futuro", () => {
    const m = monthlyRevenue(
      [
        tx({ id: "p", status: "pendente" }),
        tx({ id: "c", status: "cancelada" }),
        tx({ id: "d", kind: "despesa" }),
        tx({ id: "y", date: "2025-04-10" }),
        tx({ id: "f", date: "2026-12-01" }),
        tx({ id: "ok", date: "2026-06-01" }),
      ],
      2026,
      "2026-11-24",
    );
    expect(m.reduce((s, v) => s + v, 0)).toBe(1_000_00);
    expect(m[5]).toBe(1_000_00);
  });

  it("a soma dos meses bate com o acumulado do ano", () => {
    const list = [tx({ id: "a" }), tx({ id: "b", date: "2026-09-09", amountCents: 777_77 })];
    const total = monthlyRevenue(list, 2026).reduce((s, v) => s + v, 0);
    expect(total).toBe(1_777_77);
  });
});

describe("quarterlyRevenue", () => {
  it("agrupa de três em três meses", () => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => n * 100);
    expect(quarterlyRevenue(months)).toEqual([600, 1500, 2400, 3300]);
  });
});
