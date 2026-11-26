import { describe, expect, it } from "vitest";
import { displayTitle, historyMonths, monthTitle, searchHistory, totals, type HistoryItem } from "./history";

const item = (over: Partial<HistoryItem>): HistoryItem => ({
  date: "2026-11-19",
  amountCents: 3_015_00,
  kind: "receita",
  status: "confirmada",
  description: "Bolo decorado",
  counterparty: "CPF •••.456.789-••",
  ...over,
});

describe("historyMonths", () => {
  it("vai do mês de abertura até hoje, no ano em que a empresa abriu", () => {
    expect(historyMonths("2026-11-26", "2026-03-01")).toEqual([
      "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11",
    ]);
  });

  it("vai de janeiro até hoje nos outros anos", () => {
    expect(historyMonths("2026-02-10", "2020-05-01")).toEqual(["2026-01", "2026-02"]);
    expect(historyMonths("2026-01-05", null)).toEqual(["2026-01"]);
  });
});

describe("monthTitle", () => {
  it("escreve o mês com inicial maiúscula e o ano", () => {
    expect(monthTitle("2026-11")).toBe("Novembro de 2026");
    expect(monthTitle("2026-03")).toBe("Março de 2026");
  });
});

describe("totals", () => {
  it("soma receitas e despesas sem contar cancelados", () => {
    const t = totals([
      item({ amountCents: 100_00 }),
      item({ amountCents: 50_00, kind: "despesa" }),
      item({ amountCents: 999_00, status: "cancelada" }),
    ]);
    expect(t).toEqual({ incomeCents: 100_00, expenseCents: 50_00 });
  });
});

describe("searchHistory", () => {
  const list = [
    item({ description: "Bolo decorado" }),
    item({ description: "Compra de farinha e açúcar", kind: "despesa", amountCents: 512_37, counterparty: "CNPJ 11.222.333/••••-••" }),
  ];

  it("busca sem diferenciar maiúsculas nem acentos", () => {
    expect(searchHistory(list, "ACUCAR").map((t) => t.description)).toEqual(["Compra de farinha e açúcar"]);
    expect(searchHistory(list, "bolo").map((t) => t.description)).toEqual(["Bolo decorado"]);
  });

  it("busca pelo valor, com ou sem pontuação", () => {
    expect(searchHistory(list, "3015")).toHaveLength(1);
    expect(searchHistory(list, "3.015,00")).toHaveLength(1);
    expect(searchHistory(list, "512,37")[0]!.kind).toBe("despesa");
  });

  it("busca pelo documento da outra parte", () => {
    expect(searchHistory(list, "11.222")).toHaveLength(1);
  });

  it("busca vazia devolve tudo", () => {
    expect(searchHistory(list, "  ")).toHaveLength(2);
  });
});

describe("displayTitle", () => {
  it("põe a inicial maiúscula e deixa o vazio vazio", () => {
    expect(displayTitle("fornecimento mensal")).toBe("Fornecimento mensal");
    expect(displayTitle("  ")).toBe("");
  });
});
