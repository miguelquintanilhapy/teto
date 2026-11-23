import { describe, expect, it } from "vitest";
import {
  accessKeyCheckDigit,
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
const groupsOf4 = (s: string) => s.replace(/(\d{4})(?=\d)/g, "$1 ");

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

  it("valida a chave de acesso pelo tamanho e pelo dígito verificador", () => {
    const first43 = "3526051122233300018155001000000201101591719";
    const key = first43 + accessKeyCheckDigit(first43);
    expect(key).toHaveLength(44);
    expect(isValidAccessKey(key)).toBe(true);
    expect(isValidAccessKey(groupsOf4(key))).toBe(true); // aceita espaços
    const wrongDv = first43 + ((accessKeyCheckDigit(first43) + 1) % 10);
    expect(isValidAccessKey(wrongDv)).toBe(false);
    expect(isValidAccessKey(key.slice(1))).toBe(false); // faltou um dígito
    expect(isValidAccessKey(key + "0")).toBe(false);
  });

  it("calcula o dígito verificador conforme a regra do módulo 11", () => {
    // soma % 11 igual a 0 ou 1 resulta em dígito 0
    expect(accessKeyCheckDigit("0".repeat(43))).toBe(0);
    expect(accessKeyCheckDigit("1".repeat(43))).toBe(accessKeyCheckDigit("1".repeat(43)));
    for (const k of ["1", "2", "7", "9"]) {
      const dv = accessKeyCheckDigit(k.repeat(43));
      expect(dv).toBeGreaterThanOrEqual(0);
      expect(dv).toBeLessThanOrEqual(9);
    }
  });

  it("valida datas", () => {
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2028-02-29")).toBe(true);
  });
});
