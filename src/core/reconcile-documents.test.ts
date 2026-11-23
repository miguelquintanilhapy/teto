import { describe, expect, it } from "vitest";
import {
  deriveDirection,
  isValidAccessKey,
  isValidCnpj,
  isValidCpf,
  isValidISODate,
  isValidTaxId,
  reconcile,
  type Entry,
} from "./index";

const e = (id: string, date: string, amountCents: number): Entry => ({ id, date, amountCents });

describe("reconcile", () => {
  it("pareia por valor exato dentro da janela de dias", () => {
    const r = reconcile([e("c1", "2026-05-12", 100_00)], [e("r1", "2026-05-10", 100_00)]);
    expect(r.matches).toEqual([{ creditId: "c1", receiptId: "r1", dayDiff: 2 }]);
    expect(r.unmatchedCredits).toEqual([]);
    expect(r.unmatchedReceipts).toEqual([]);
  });

  it("ignora valores diferentes ou datas fora da janela", () => {
    const r = reconcile(
      [e("c1", "2026-05-20", 100_00), e("c2", "2026-05-10", 99_00)],
      [e("r1", "2026-05-10", 100_00)],
    );
    expect(r.matches).toEqual([]);
    expect(r.unmatchedCredits).toHaveLength(2);
    expect(r.unmatchedReceipts).toHaveLength(1);
  });

  it("é um-para-um e prefere a data mais próxima", () => {
    const r = reconcile(
      [e("c1", "2026-05-10", 50_00), e("c2", "2026-05-13", 50_00)],
      [e("r1", "2026-05-12", 50_00)],
    );
    expect(r.matches).toEqual([{ creditId: "c2", receiptId: "r1", dayDiff: 1 }]);
    expect(r.unmatchedCredits.map((c) => c.id)).toEqual(["c1"]);
  });

  it("entradas sem nota viram 'receita possivelmente não declarada'", () => {
    const r = reconcile([e("c1", "2026-05-10", 300_00)], []);
    expect(r.unmatchedCredits).toEqual([e("c1", "2026-05-10", 300_00)]);
  });
});

describe("deriveDirection", () => {
  const MEI = "11.222.333/0001-81";
  const OTHER = "52998224725";

  it("é receita quando o MEI é o emissor", () => {
    expect(deriveDirection(MEI, "11222333000181", OTHER)).toBe("receita");
  });

  it("é despesa quando o MEI é o destinatário", () => {
    expect(deriveDirection(MEI, OTHER, "11.222.333/0001-81")).toBe("despesa");
  });

  it("é indefinida quando o MEI não aparece, aparece nos dois lados ou faltam dados", () => {
    expect(deriveDirection(MEI, OTHER, "04.252.011/0001-10")).toBe("indefinida");
    expect(deriveDirection(MEI, MEI, MEI)).toBe("indefinida");
    expect(deriveDirection(MEI, null, null)).toBe("indefinida");
    expect(deriveDirection("", MEI, OTHER)).toBe("indefinida");
  });
});

describe("documentos", () => {
  it("valida CPF pelos dígitos verificadores", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });

  it("valida CNPJ pelos dígitos verificadores", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
  });

  it("escolhe CPF ou CNPJ pelo tamanho", () => {
    expect(isValidTaxId("52998224725")).toBe(true);
    expect(isValidTaxId("11222333000181")).toBe(true);
    expect(isValidTaxId("123")).toBe(false);
  });

  it("valida chave de acesso e datas", () => {
    expect(isValidAccessKey("1".repeat(44))).toBe(true);
    expect(isValidAccessKey("1".repeat(43))).toBe(false);
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2028-02-29")).toBe(true);
  });
});
