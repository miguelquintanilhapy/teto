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
  for (const id of [r.issuerTaxId, r.recipientTaxId]) {
    if (id !== null && !isValidTaxId(id)) {
      issues.push("CPF/CNPJ com dígito verificador inválido");
      break;
    }
  }
  if (r.accessKey !== null && !isValidAccessKey(r.accessKey)) {
    issues.push("chave de acesso inválida (44 dígitos com dígito verificador correto)");
  }
  if (r.confidence < rules.minConfidence) {
    issues.push(`confiança ${r.confidence} abaixo do mínimo ${rules.minConfidence}`);
  }
  return issues;
}
