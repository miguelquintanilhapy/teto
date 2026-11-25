import { describe, expect, it } from "vitest";
import { describeEvent, limitImpact } from "./transaction-detail";

const nb = (s: string) => s.replace(/ /g, " ");

describe("limitImpact", () => {
  it("só receita confirmada conta no limite", () => {
    expect(limitImpact({ kind: "receita", status: "confirmada" }).counts).toBe(true);
    expect(limitImpact({ kind: "despesa", status: "confirmada" })).toMatchObject({ counts: false });
    expect(limitImpact({ kind: "receita", status: "cancelada" })).toMatchObject({ counts: false });
    expect(limitImpact({ kind: "receita", status: "pendente" })).toMatchObject({ counts: false });
  });

  it("explica o motivo em cada caso", () => {
    expect(limitImpact({ kind: "despesa", status: "confirmada" }).reason).toContain("despesa");
    expect(limitImpact({ kind: "receita", status: "cancelada" }).reason).toContain("cancelado");
    expect(limitImpact({ kind: "receita", status: "pendente" }).reason).toContain("confirmação");
  });
});

describe("describeEvent", () => {
  it("descreve confirmação e cancelamento", () => {
    expect(describeEvent({ action: "confirmed", changes: {}, createdAt: "" }).title).toBe("Confirmado");
    expect(describeEvent({ action: "cancelled", changes: {}, createdAt: "" }).title).toBe("Cancelado");
  });

  it("escreve cada correção com o antes e o depois", () => {
    const d = describeEvent({
      action: "corrected",
      createdAt: "",
      changes: {
        amountCents: { from: 125_000, to: 130_000 },
        date: { from: "2026-05-10", to: "2026-05-12" },
        description: { from: "", to: "Bolo" },
      },
    });
    expect(d.title).toBe("Corrigido");
    expect(d.lines.map(nb)).toEqual([
      "Valor: R$ 1.250,00 → R$ 1.300,00",
      "Data: 10 mai 2026 → 12 mai 2026",
      "Descrição: sem descrição → Bolo",
    ]);
  });

  it("ignora mudanças fora do formato em vez de quebrar", () => {
    const d = describeEvent({ action: "corrected", createdAt: "", changes: { amountCents: "x", date: null } });
    expect(d.lines).toEqual([]);
  });
});
