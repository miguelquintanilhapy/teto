import { describe, expect, it } from "vitest";
import {
  centsPart,
  maskEmail,
  formatCnpjInput,
  formatCompact,
  formatDayMonth,
  formatFullShortDate,
  formatMoney,
  formatPercent,
  formatReais,
  formatShortDate,
  maskTaxId,
  monthInitial,
  wholeReais,
} from "./format";

const nb = (s: string) => s.replace(/ /g, " ");

describe("formatação de dinheiro", () => {
  it("arredonda para reais inteiros e usa ponto de milhar", () => {
    expect(nb(formatReais(60_000_00))).toBe("R$ 60.000");
    expect(nb(formatReais(6_750_49))).toBe("R$ 6.750");
  });

  it("mostra os centavos quando pedido", () => {
    expect(nb(formatMoney(1_280_00))).toBe("R$ 1.280,00");
    expect(nb(formatMoney(82_05))).toBe("R$ 82,05");
  });

  it("separa a parte inteira dos centavos", () => {
    expect(wholeReais(60_000_00)).toBe("60.000");
    expect(centsPart(60_000_07)).toBe(",07");
    expect(centsPart(60_000_00)).toBe(",00");
  });

  it("não deixa o símbolo e o número em linhas diferentes", () => {
    expect(formatReais(1_000_00)).toContain(" ");
    expect(formatMoney(1_000_00)).toContain(" ");
  });
});

describe("formatação de datas e percentuais", () => {
  it("escreve o dia e o mês por extenso, com o 1º ordinal", () => {
    expect(formatDayMonth("2026-12-28")).toBe("28 de dezembro");
    expect(formatDayMonth("2027-01-01")).toBe("1º de janeiro");
  });

  it("abrevia o mês", () => {
    expect(formatShortDate("2026-12-20")).toBe("20 dez");
    expect(formatFullShortDate("2026-11-22")).toBe("22 nov 2026");
  });

  it("arredonda o percentual", () => {
    expect(formatPercent(0.889)).toBe("89%");
    expect(formatPercent(1.2)).toBe("120%");
  });

  it("usa a inicial do mês no gráfico", () => {
    expect([2, 3, 4, 5].map(monthInitial)).toEqual(["M", "A", "M", "J"]);
  });
});

describe("formatCompact", () => {
  it("encurta valores de rótulo de gráfico", () => {
    expect(formatCompact(6_700_00)).toBe("6,7 mil");
    expect(formatCompact(10_000_00)).toBe("10 mil");
    expect(formatCompact(850_00)).toBe("850");
    expect(formatCompact(0)).toBe("0");
  });
});

describe("maskTaxId", () => {
  it("esconde os dígitos que não ajudam a reconhecer o CPF", () => {
    expect(maskTaxId("123.456.789-09")).toBe("CPF •••.456.789-••");
  });

  it("trata CNPJ, vazio e inválido", () => {
    expect(maskTaxId("11222333000181")).toBe("CNPJ 11.222.333/••••-••");
    expect(maskTaxId(null)).toBe("não identificado");
    expect(maskTaxId("123")).toBe("documento inválido");
  });
});

describe("formatCnpjInput", () => {
  it("coloca a pontuação enquanto o CNPJ é digitado", () => {
    expect(formatCnpjInput("11")).toBe("11");
    expect(formatCnpjInput("11222")).toBe("11.222");
    expect(formatCnpjInput("11222333000")).toBe("11.222.333/000");
    expect(formatCnpjInput("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("ignora letras e passa de 14 números", () => {
    expect(formatCnpjInput("11.222.333/0001-81 99")).toBe("11.222.333/0001-81");
    expect(formatCnpjInput("abc")).toBe("");
  });
});

describe("maskEmail", () => {
  it("esconde o miolo do endereço", () => {
    expect(maskEmail("marta@example.com")).toBe("m•••@example.com");
    expect(maskEmail("semarroba")).toBe("não informado");
    expect(maskEmail("@x.com")).toBe("não informado");
  });
});
