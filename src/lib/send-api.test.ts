import { describe, expect, it } from "vitest";
import { readConfirmResponse, readUploadResponse } from "./send-api";

const extracted = (over: Record<string, unknown> = {}, data: Record<string, unknown> = {}) => ({
  status: "extracted",
  document: { id: "doc-1", kind: "nota" },
  extraction: {
    id: "e1",
    data: {
      documentType: "nota_fiscal",
      issueDate: "2026-11-22",
      totalCents: 128000,
      issuerTaxId: "11222333000181",
      recipientTaxId: "12345678909",
      accessKey: null,
      description: "Bolo de casamento",
      confidence: 0.92,
      ...data,
    },
  },
  issues: [],
  ...over,
});

describe("readUploadResponse", () => {
  it("transforma uma extração em valores para conferir", () => {
    const r = readUploadResponse(200, extracted());
    expect(r.kind).toBe("review");
    if (r.kind !== "review") return;
    expect(r.values).toMatchObject({
      documentId: "doc-1",
      documentType: "nota_fiscal",
      amountCents: 128000,
      date: "2026-11-22",
      description: "Bolo de casamento",
    });
    expect(r.duplicate).toBe(false);
    expect(r.lowTrust).toBe(false);
  });

  it("pede atenção extra quando a IA teve dúvida ou a validação achou problemas", () => {
    const low = readUploadResponse(200, extracted({}, { confidence: 0.5 }));
    const issues = readUploadResponse(200, extracted({ issues: ["data no futuro"] }));
    expect(low.kind === "review" && low.lowTrust).toBe(true);
    expect(issues.kind === "review" && issues.lowTrust).toBe(true);
  });

  it("marca o arquivo repetido", () => {
    const r = readUploadResponse(200, extracted({ status: "duplicate" }));
    expect(r.kind === "review" && r.duplicate).toBe(true);
  });

  it("abre o preenchimento manual quando a IA não conseguiu ler", () => {
    const r = readUploadResponse(200, { status: "manual_entry", reason: "unreadable", document: { id: "d2", kind: "nota" }, extraction: null });
    expect(r).toEqual({ kind: "manual", documentId: "d2", reason: "unreadable" });
  });

  it("mostra a mensagem do servidor nos erros", () => {
    expect(readUploadResponse(413, { error: "too_large", message: "O arquivo passa do limite de 4 MB." })).toEqual({
      kind: "error",
      message: "O arquivo passa do limite de 4 MB.",
    });
  });

  it("não quebra com resposta fora do formato", () => {
    expect(readUploadResponse(200, null).kind).toBe("error");
    expect(readUploadResponse(200, "x").kind).toBe("error");
    expect(readUploadResponse(200, { status: "outra-coisa" }).kind).toBe("error");
    const r = readUploadResponse(200, { status: "extracted", extraction: { data: { totalCents: "abc", issueDate: 5 } } });
    expect(r.kind === "review" && r.values.amountCents).toBe(0);
    expect(r.kind === "review" && r.values.date).toBe("");
  });

  it("nunca deixa o valor ficar negativo", () => {
    const r = readUploadResponse(200, extracted({}, { totalCents: -500 }));
    expect(r.kind === "review" && r.values.amountCents).toBe(0);
  });
});

describe("readConfirmResponse", () => {
  it("reconhece criado e repetido", () => {
    expect(readConfirmResponse(201, { status: "created" })).toEqual({ kind: "created" });
    expect(readConfirmResponse(200, { status: "duplicate" })).toEqual({ kind: "duplicate" });
  });

  it("devolve a mensagem do servidor quando a confirmação é recusada", () => {
    expect(readConfirmResponse(422, { error: "invalid", message: "A data está no futuro." })).toEqual({
      kind: "error",
      message: "A data está no futuro.",
    });
  });

  it("usa uma mensagem humana para falha do servidor", () => {
    const r = readConfirmResponse(500, { error: "internal" });
    expect(r.kind === "error" && r.message).toContain("Tente de novo");
  });
});

describe("readUploadResponse: chave de acesso descartada", () => {
  const body = (issues: string[]) => ({
    status: "extracted",
    document: { id: "d1" },
    extraction: { data: { documentType: "nota_fiscal", totalCents: 10000, issueDate: "2026-05-10", confidence: 0.95 } },
    issues,
  });

  it("tem aviso próprio e não vira 'a IA teve dúvida'", () => {
    const r = readUploadResponse(200, body(["chave de acesso ilegível, ignorada"]));
    expect(r.kind === "review" && r.keyDropped).toBe(true);
    expect(r.kind === "review" && r.lowTrust).toBe(false);
    expect(r.kind === "review" && r.issues).toEqual([]);
  });

  it("outros avisos continuam gerando dúvida", () => {
    const r = readUploadResponse(200, body(["chave de acesso ilegível, ignorada", "confiança baixa"]));
    expect(r.kind === "review" && r.keyDropped).toBe(true);
    expect(r.kind === "review" && r.lowTrust).toBe(true);
  });

  it("sem aviso, nada disso aparece", () => {
    const r = readUploadResponse(200, body([]));
    expect(r.kind === "review" && r.keyDropped).toBe(false);
  });
});
