import { describe, expect, it } from "vitest";
import { isOwnMovement, parseStatementAmount, parseStatementCsv, parseStatementDate, splitCsvLine } from "./statement";

describe("splitCsvLine", () => {
  it("respeita aspas e aspas duplicadas", () => {
    expect(splitCsvLine('a;"b;c";"d ""e"""', ";")).toEqual(["a", "b;c", 'd "e"']);
  });
});

describe("parseStatementDate", () => {
  it("aceita os formatos dos bancos", () => {
    expect(parseStatementDate("15/10/2026")).toBe("2026-10-15");
    expect(parseStatementDate("5/3/26")).toBe("2026-03-05");
    expect(parseStatementDate("2026-10-15")).toBe("2026-10-15");
    expect(parseStatementDate("2026-10-15T10:00:00")).toBe("2026-10-15");
  });
  it("recusa datas inválidas", () => {
    expect(parseStatementDate("31/02/2026")).toBeNull();
    expect(parseStatementDate("ontem")).toBeNull();
  });
});

describe("parseStatementAmount", () => {
  it("lê o formato brasileiro e o internacional", () => {
    expect(parseStatementAmount("1.234,56")).toBe(123456);
    expect(parseStatementAmount("R$ 1.234,56")).toBe(123456);
    expect(parseStatementAmount("1234.56")).toBe(123456);
    expect(parseStatementAmount("380,5")).toBe(38050);
    expect(parseStatementAmount("1.234")).toBe(123400); // ponto de milhar, sem centavos
  });
  it("entende os jeitos de escrever valor negativo", () => {
    expect(parseStatementAmount("-512,37")).toBe(-51237);
    expect(parseStatementAmount("(512,37)")).toBe(-51237);
    expect(parseStatementAmount("512,37-")).toBe(-51237);
  });
  it("recusa o que não é valor", () => {
    expect(parseStatementAmount("")).toBeNull();
    expect(parseStatementAmount("abc")).toBeNull();
    expect(parseStatementAmount("1,2,3a")).toBeNull();
  });
});

describe("parseStatementCsv", () => {
  it("lê um extrato no estilo Inter (ponto e vírgula, vírgula decimal)", () => {
    const csv = "Extrato Conta Corrente\nData Lançamento;Histórico;Descrição;Valor;Saldo\n05/11/2026;Pix recebido;Cliente A;3.685,00;10.000,00\n06/11/2026;Pix enviado;Fornecedor;-512,37;9.487,63\n";
    const r = parseStatementCsv(csv);
    expect(r.error).toBeNull();
    expect(r.entries).toEqual([
      { id: "l2", date: "2026-11-05", amountCents: 368500, description: "Cliente A", type: "" },
      { id: "l3", date: "2026-11-06", amountCents: -51237, description: "Fornecedor", type: "" },
    ]);
  });

  it("lê um extrato no estilo Nubank (vírgula, ponto decimal, aspas)", () => {
    const csv = 'Data,Valor,Identificador,Descrição\n19/11/2026,3015.00,abc,"Transferência recebida, Pix"\n';
    const r = parseStatementCsv(csv);
    expect(r.entries).toEqual([{ id: "l1", date: "2026-11-19", amountCents: 301500, description: "Transferência recebida, Pix", type: "" }]);
  });

  it("lê um extrato no estilo PicPay (menos tipográfico, \"origem / destino\" e tipo)", () => {
    const csv = [
      'data,hora,tipo,"origem / destino",valor,"forma de pagamento"',
      '2026-11-19,14:56,"Pix recebido","CLIENTE FICTICIO LTDA","+R$ 200,00",',
      '2026-11-19,17:16,"Compra realizada","Padaria Exemplo","−R$ 8,00","Com saldo"',
      '2026-11-18,12:54,"Dinheiro resgatado","Do cofrinho Viagem","+R$ 10,00",',
    ].join("\n");
    const r = parseStatementCsv(csv);
    expect(r.skipped).toBe(0);
    expect(r.entries).toEqual([
      { id: "l1", date: "2026-11-19", amountCents: 20000, description: "CLIENTE FICTICIO LTDA", type: "Pix recebido" },
      { id: "l2", date: "2026-11-19", amountCents: -800, description: "Padaria Exemplo", type: "Compra realizada" },
      { id: "l3", date: "2026-11-18", amountCents: 1000, description: "Do cofrinho Viagem", type: "Dinheiro resgatado" },
    ]);
    expect(isOwnMovement(r.entries[2]!)).toBe(true);
    expect(isOwnMovement(r.entries[0]!)).toBe(false);
  });

  it("conta as linhas que não deu para ler", () => {
    const r = parseStatementCsv("data;valor\n01/11/2026;100,00\nlixo;x\n02/11/2026;0,00\n");
    expect(r.entries).toHaveLength(1);
    expect(r.skipped).toBe(2);
  });

  it("explica quando o arquivo não serve", () => {
    expect(parseStatementCsv("").error).toContain("vazio");
    expect(parseStatementCsv("a;b\n1;2").error).toContain("colunas");
    expect(parseStatementCsv("data;valor\nx;y").error).toContain("Nenhuma linha");
  });

  it("ignora o BOM do Excel", () => {
    expect(parseStatementCsv("﻿data;valor\n01/11/2026;10,00").entries).toHaveLength(1);
  });
});
