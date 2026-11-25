import { describe, expect, it } from "vitest";
import { buildYearReport, csvText, transactionsToCsv, type ReportTransaction } from "./report";

const t = (over: Partial<ReportTransaction> = {}): ReportTransaction => ({
  date: "2026-05-10",
  amountCents: 1_000_00,
  kind: "receita",
  source: "nota",
  status: "confirmada",
  description: "Bolo",
  ...over,
});

describe("buildYearReport", () => {
  it("soma receita e despesa confirmadas por mês", () => {
    const r = buildYearReport(
      [t(), t({ amountCents: 500_00 }), t({ date: "2026-11-02", amountCents: 200_00 }), t({ kind: "despesa", amountCents: 80_00 })],
      2026,
    );
    expect(r.months[4]).toMatchObject({ revenueCents: 1_500_00, revenueCount: 2, expenseCents: 80_00 });
    expect(r.months[10]).toMatchObject({ revenueCents: 200_00, revenueCount: 1 });
    expect(r.revenueCents).toBe(1_700_00);
    expect(r.expenseCents).toBe(80_00);
  });

  it("ignora pendente e cancelada nas somas, mas conta cada uma", () => {
    const r = buildYearReport([t({ status: "pendente" }), t({ status: "cancelada" }), t({ status: "cancelada" })], 2026);
    expect(r.revenueCents).toBe(0);
    expect(r).toMatchObject({ pendingCount: 1, cancelledCount: 2 });
  });

  it("só olha o ano pedido", () => {
    expect(buildYearReport([t({ date: "2025-12-31" })], 2026).revenueCents).toBe(0);
  });
});

describe("csvText: proteção contra injeção de fórmula", () => {
  it("põe apóstrofo em texto que começa com caractere de fórmula", () => {
    for (const evil of ["=HYPERLINK(\"http://x\")", "+55 11 99999", "-2+3", "@SUM(A1)", "\tcmd"]) {
      expect(csvText(evil).replace(/^"/, "").startsWith("'")).toBe(true);
    }
  });

  it("escapa aspas, ponto e vírgula e quebra de linha", () => {
    expect(csvText('diz "oi"; tchau')).toBe('"diz ""oi""; tchau"');
    expect(csvText("linha1\nlinha2")).toBe('"linha1\nlinha2"');
    expect(csvText("simples")).toBe("simples");
  });
});

describe("transactionsToCsv", () => {
  it("usa ponto e vírgula, vírgula decimal e BOM, em ordem de data", () => {
    const csv = transactionsToCsv([t({ date: "2026-06-01", amountCents: 123_45, description: "B" }), t({ date: "2026-05-10", description: "=1+1" })]);
    const lines = csv.replace("﻿", "").trim().split("\r\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(lines[0]).toBe("Data;Tipo;Valor (R$);Situação;Origem;Descrição");
    expect(lines[1]).toBe("2026-05-10;Receita;1000,00;confirmada;nota;'=1+1");
    expect(lines[2]).toBe("2026-06-01;Receita;123,45;confirmada;nota;B");
  });

  it("gera só o cabeçalho sem lançamentos", () => {
    expect(transactionsToCsv([]).replace("﻿", "")).toBe("Data;Tipo;Valor (R$);Situação;Origem;Descrição\r\n");
  });
});
