import { z } from "zod";

/** Contrato do que um modelo de visão deve devolver para cada documento. */
export const ExtractedReceiptSchema = z.object({
  documentType: z.enum(["nota_fiscal", "recibo", "comprovante_pix", "outro"]),
  /** Data de emissão, YYYY-MM-DD. */
  issueDate: z.string(),
  /** Valor total em centavos (inteiro). */
  totalCents: z.number().int(),
  /** CPF ou CNPJ da outra parte, se legível. */
  counterpartyTaxId: z.string().nullable(),
  /** Chave de acesso de 44 dígitos, se houver. */
  accessKey: z.string().nullable(),
  description: z.string(),
  kind: z.enum(["receita", "despesa"]),
  /** Confiança global do modelo, de 0 a 1. */
  confidence: z.number().min(0).max(1),
});

export type ExtractedReceipt = z.infer<typeof ExtractedReceiptSchema>;

/** Mesmo contrato em JSON Schema, para enviar aos provedores (saída estruturada). */
export const extractedReceiptJsonSchema = z.toJSONSchema(ExtractedReceiptSchema);

export type ParseResult =
  | { ok: true; data: ExtractedReceipt }
  | { ok: false; issues: string[] };

export function parseExtraction(raw: unknown): ParseResult {
  const r = ExtractedReceiptSchema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, issues: r.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`) };
}
