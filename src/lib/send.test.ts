import { describe, expect, it } from "vitest";
import {
  centsFromInput,
  directionOf,
  impactOf,
  reviewErrors,
  toConfirmBody,
  type ReviewValues,
  type SendContext,
} from "./send";

const MEI = "11222333000181";
const ctx: SendContext = {
  taxId: MEI,
  year: 2026,
  today: "2026-11-24",
  limitCents: 67_500_00,
  accumulatedCents: 60_000_00,
};

const values = (over: Partial<ReviewValues> = {}): ReviewValues => ({
  documentId: "7d0a2b52-2f7c-4d3a-9d3e-6c3b5d0c1a11",
  documentType: "nota_fiscal",
  amountCents: 1_280_00,
  date: "2026-11-22",
  description: "Bolo de casamento",
  issuerTaxId: "11.222.333/0001-81",
  recipientTaxId: "123.456.789-09",
  accessKey: null,
  confidence: 0.9,
  ...over,
});

describe("centsFromInput", () => {
  it("lê só os números, como uma máscara de dinheiro", () => {
    expect(centsFromInput("R$ 1.280,00")).toBe(128_000);
    expect(centsFromInput("5")).toBe(5);
    expect(centsFromInput("")).toBe(0);
    expect(centsFromInput("abc")).toBe(0);
  });

  it("limita o tamanho para não estourar o número inteiro seguro", () => {
    expect(centsFromInput("99999999999999999999")).toBe(99_999_999_999);
  });
});

describe("directionOf", () => {
  it("é receita quando o MEI é quem emitiu", () => {
    expect(directionOf(ctx, values())).toBe("receita");
  });
  it("é despesa quando o MEI é quem recebeu a nota", () => {
    expect(directionOf(ctx, values({ issuerTaxId: "12.345.678/0001-95", recipientTaxId: MEI }))).toBe("despesa");
  });
  it("é indefinida quando o CNPJ do MEI não aparece", () => {
    expect(directionOf(ctx, values({ issuerTaxId: null, recipientTaxId: null }))).toBe("indefinida");
  });
});

describe("impactOf", () => {
  it("soma a receita e reclassifica a faixa de risco", () => {
    const i = impactOf(ctx, 1_280_00, "receita");
    expect(i.afterCents).toBe(61_280_00);
    expect(i.addedCents).toBe(1_280_00);
    expect(i.ratio).toBeCloseTo(61_280_00 / 67_500_00);
    expect(i.band).toBe("critical"); // 90,8% do limite: passou dos 90%
  });

  it("despesa e direção indefinida não somam ao limite", () => {
    expect(impactOf(ctx, 1_280_00, "despesa").afterCents).toBe(60_000_00);
    expect(impactOf(ctx, 1_280_00, "indefinida").addedCents).toBe(0);
  });

  it("passa para a faixa acima do limite quando o valor estoura", () => {
    expect(impactOf(ctx, 9_000_00, "receita").band).toBe("over_tolerance");
  });
});

describe("reviewErrors", () => {
  it("aceita dados corretos", () => {
    expect(reviewErrors({ amountCents: 100, date: "2026-11-24" }, "2026-11-24")).toEqual({});
  });
  it("explica cada campo", () => {
    expect(reviewErrors({ amountCents: 0, date: "2026-02-30" }, "2026-11-24")).toEqual({
      amount: "Informe um valor maior que zero.",
      date: "Informe uma data válida.",
    });
  });
  it("não aceita data futura", () => {
    expect(reviewErrors({ amountCents: 100, date: "2026-11-25" }, "2026-11-24").date).toBe(
      "A data não pode ser depois de hoje.",
    );
  });
});

describe("toConfirmBody", () => {
  it("não envia o tipo, o status nem o perfil: o servidor decide", () => {
    const body = toConfirmBody(values());
    expect(body).not.toHaveProperty("kind");
    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("profileId");
    expect(body).toMatchObject({ amountCents: 1_280_00, date: "2026-11-22", source: "nota" });
  });

  it("marca Pix e lançamento manual pela origem", () => {
    expect(toConfirmBody(values({ documentType: "comprovante_pix" })).source).toBe("pix");
    expect(toConfirmBody(values({ documentType: null })).source).toBe("manual");
  });

  it("corta a descrição no limite aceito pela API", () => {
    expect((toConfirmBody(values({ description: "x".repeat(400) })).description as string).length).toBe(300);
  });
});
