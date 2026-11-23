import { addDays, isValidAccessKey, isValidISODate, isValidTaxId, type ISODate } from "@/core";
import type { ExtractedReceipt } from "./schema";

export interface BusinessRules {
  /** Abaixo disso, a extração é considerada duvidosa. */
  minConfidence: number;
  /** Data de hoje, injetada para manter a função pura e testável. */
  today: ISODate;
}

/**
 * Regras que o modelo não consegue garantir sozinho. Qualquer problema aqui
 * faz o roteador escalar para o próximo modelo. A saída da IA nunca é
 * confiável por padrão: é validada por código determinístico.
 */
export function checkBusinessRules(r: ExtractedReceipt, rules: BusinessRules): string[] {
  const issues: string[] = [];
  if (!isValidISODate(r.issueDate)) {
    issues.push("data de emissão inválida");
  } else if (r.issueDate > addDays(rules.today, 1)) {
    issues.push("data de emissão no futuro");
  }
  if (r.totalCents <= 0) issues.push("valor deve ser positivo");
  if (r.counterpartyTaxId !== null && !isValidTaxId(r.counterpartyTaxId)) {
    issues.push("CPF/CNPJ com dígito verificador inválido");
  }
  if (r.accessKey !== null && !isValidAccessKey(r.accessKey)) {
    issues.push("chave de acesso deve ter 44 dígitos");
  }
  if (r.confidence < rules.minConfidence) {
    issues.push(`confiança ${r.confidence} abaixo do mínimo ${rules.minConfidence}`);
  }
  return issues;
}
