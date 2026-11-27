import { describe, expect, it } from "vitest";
import { launchHref, readLaunchParams, reconcileStatement } from "./reconciliation";
import type { StatementEntry } from "./statement";

const credit = (id: string, date: string, amountCents: number, description = "", type = ""): StatementEntry => ({ id, date, amountCents, description, type });
const receipt = (id: string, date: string, amountCents: number) => ({ id, date, amountCents, description: id });

describe("reconcileStatement", () => {
  it("deixa de fora resgate de cofrinho e estorno, que não são venda, e conta as saídas", () => {
    const r = reconcileStatement(
      [
        credit("c1", "2026-11-05", 2000, "Do cofrinho Viagem", "Dinheiro resgatado"),
        credit("c2", "2026-11-05", 5000, "Cliente Fictício", "Pix recebido"),
        credit("c3", "2026-11-06", 990, "Loja Exemplo", "Estorno"),
        credit("d1", "2026-11-06", -1000, "Mercado Exemplo", "Compra realizada"),
      ],
      [],
    );
    expect(r.unmatchedCredits.map((c) => c.id)).toEqual(["c2"]);
    expect(r.creditCount).toBe(1);
    expect(r.ownMovementCount).toBe(2);
    expect(r.debitCount).toBe(1);
  });

  it("casa crédito e nota de mesmo valor em até 3 dias, e separa o resto", () => {
    const r = reconcileStatement(
      [credit("c1", "2026-11-05", 368500), credit("c2", "2026-11-19", 301500), credit("d1", "2026-11-06", -51237)],
      [receipt("n1", "2026-11-04", 368500), receipt("n2", "2026-11-10", 99900)],
    );
    expect(r.creditCount).toBe(2); // débito não entra
    expect(r.matched.map((m) => [m.credit.id, m.receipt.id, m.dayDiff])).toEqual([["c1", "n1", 1]]);
    expect(r.unmatchedCredits.map((c) => c.id)).toEqual(["c2"]);
    expect(r.unmatchedReceipts.map((n) => n.id)).toEqual(["n2"]);
    expect(r.unmatchedCreditsTotalCents).toBe(301500);
  });

  it("não acusa nota sem entrada de meses que o extrato não cobre", () => {
    const r = reconcileStatement([credit("c1", "2026-11-05", 1000)], [receipt("velha", "2026-03-10", 5000)]);
    expect(r.unmatchedReceipts).toEqual([]);
  });

  it("é um-para-um: duas entradas iguais não casam com uma só nota", () => {
    const r = reconcileStatement([credit("a", "2026-11-05", 1000), credit("b", "2026-11-05", 1000)], [receipt("n", "2026-11-05", 1000)]);
    expect(r.matched).toHaveLength(1);
    expect(r.unmatchedCredits).toHaveLength(1);
  });

  it("funciona sem créditos", () => {
    const r = reconcileStatement([credit("d", "2026-11-05", -100)], [receipt("n", "2026-11-05", 100)]);
    expect(r).toMatchObject({ creditCount: 0, matched: [], unmatchedReceipts: [] });
  });
});

describe("launchHref e readLaunchParams", () => {
  const params = (href: string) => new URL(href, "http://x").searchParams;

  it("ida e volta preservam valor, data e descrição", () => {
    const p = params(launchHref({ date: "2026-11-19", amountCents: 301500, description: "Pix de Maria & Cia" }));
    expect(readLaunchParams((k) => p.get(k), "2026-11-24")).toEqual({ amountCents: 301500, date: "2026-11-19", description: "Pix de Maria & Cia" });
  });

  it("não confia no link: valor, data e texto inválidos são descartados", () => {
    const p = new URLSearchParams({ valor: "-5", data: "2026-12-31", desc: "a\u0000b".repeat(200) });
    const r = readLaunchParams((k) => p.get(k), "2026-11-24");
    expect(r.amountCents).toBe(0);
    expect(r.date).toBe("");
    expect(r.description.length).toBeLessThanOrEqual(300);
    expect(r.description).not.toContain("\u0000");
    expect(readLaunchParams(() => null, "2026-11-24")).toEqual({ amountCents: 0, date: "", description: "" });
    const big = new URLSearchParams({ valor: "99999999999999999999" });
    expect(readLaunchParams((k) => big.get(k), "2026-11-24").amountCents).toBe(0);
  });
});
