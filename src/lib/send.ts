import {
  classifyRisk,
  deriveDirection,
  isValidISODate,
  rulesFor,
  type Cents,
  type Direction,
  type ISODate,
  type RiskBand,
} from "@/core";

/** O que o fluxo de envio precisa saber do painel, já em tipos simples (vem do servidor). */
export interface SendContext {
  /** CNPJ do MEI, só dígitos. */
  taxId: string;
  year: number;
  today: ISODate;
  limitCents: Cents;
  accumulatedCents: Cents;
}

/** Dados que o usuário confere antes de confirmar. */
export interface ReviewValues {
  documentId: string | null;
  documentType: "nota_fiscal" | "recibo" | "comprovante_pix" | "outro" | null;
  amountCents: Cents;
  date: string;
  description: string;
  issuerTaxId: string | null;
  recipientTaxId: string | null;
  accessKey: string | null;
  confidence: number | null;
}

/** Máscara de dinheiro: o usuário digita só números e o valor "sobe" da direita para a esquerda. */
export function centsFromInput(raw: string): Cents {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  return digits === "" ? 0 : Number(digits);
}

/** Receita ou despesa, decidido pelo código comparando com o CNPJ do MEI. */
export function directionOf(ctx: Pick<SendContext, "taxId">, v: Pick<ReviewValues, "issuerTaxId" | "recipientTaxId">): Direction {
  return deriveDirection(ctx.taxId, v.issuerTaxId, v.recipientTaxId);
}

export interface Impact {
  afterCents: Cents;
  ratio: number;
  band: RiskBand;
  /** Quanto desta nota entra no limite (zero se não for receita). */
  addedCents: Cents;
}

/** Como o limite fica se esta nota for confirmada. Só receita soma. */
export function impactOf(ctx: SendContext, amountCents: Cents, direction: Direction): Impact {
  const addedCents = direction === "receita" ? Math.max(0, amountCents) : 0;
  const afterCents = ctx.accumulatedCents + addedCents;
  const cfg = rulesFor(ctx.year);
  return {
    afterCents,
    addedCents,
    ratio: ctx.limitCents > 0 ? afterCents / ctx.limitCents : 0,
    band: classifyRisk(afterCents, ctx.limitCents, cfg),
  };
}

export interface FormErrors {
  amount?: string;
  date?: string;
}

/** Erros específicos por campo, como pede a Apple: nunca um genérico "inválido". */
export function reviewErrors(v: Pick<ReviewValues, "amountCents" | "date">, today: ISODate): FormErrors {
  const errors: FormErrors = {};
  if (v.amountCents <= 0) errors.amount = "Informe um valor maior que zero.";
  if (!isValidISODate(v.date)) errors.date = "Informe uma data válida.";
  else if (v.date > today) errors.date = "A data não pode ser depois de hoje.";
  return errors;
}

/**
 * Corpo do POST /api/transactions. O tipo só vai quando o código não conseguiu decidir pelos CPF/CNPJ
 * (nota sem o CNPJ do MEI, Pix, lançamento manual) e o usuário escolheu. Nos demais casos quem decide é o
 * servidor. O cliente nunca define status, perfil nem id.
 */
export function toConfirmBody(v: ReviewValues, explicitKind?: "receita" | "despesa"): Record<string, unknown> {
  const source = v.documentType === "comprovante_pix" ? "pix" : v.documentType === null ? "manual" : "nota";
  return {
    ...(explicitKind ? { kind: explicitKind } : {}),
    documentId: v.documentId,
    date: v.date,
    issueDate: v.date,
    amountCents: v.amountCents,
    issuerTaxId: v.issuerTaxId,
    recipientTaxId: v.recipientTaxId,
    source,
    accessKey: v.accessKey,
    description: v.description.trim().slice(0, 300),
    confidence: v.confidence,
  };
}

/** A IA teve dúvida? Abaixo disso, a tela pede atenção extra à data e ao valor. */
export const LOW_CONFIDENCE = 0.75;
