/** Validação de documentos brasileiros (dígitos verificadores). */

const onlyDigits = (s: string) => s.replace(/\D/g, "");

function allSame(d: string) {
  return /^(\d)\1+$/.test(d);
}

export function isValidCpf(input: string): boolean {
  const d = onlyDigits(input);
  if (d.length !== 11 || allSame(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function isValidCnpj(input: string): boolean {
  const d = onlyDigits(input);
  if (d.length !== 14 || allSame(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export function isValidTaxId(input: string): boolean {
  const len = onlyDigits(input).length;
  return len === 11 ? isValidCpf(input) : len === 14 ? isValidCnpj(input) : false;
}

export type Direction = "receita" | "despesa" | "indefinida";

/**
 * Decide, no código, se o documento é receita ou despesa do MEI: ele é receita
 * se for o emissor (quem vendeu ou recebeu) e despesa se for o destinatário
 * (quem comprou ou pagou). A IA só lê as duas partes; nunca decide isso.
 * Se o CNPJ do MEI não aparece (ou aparece nos dois lados), é "indefinida" e o
 * usuário escolhe.
 */
export function deriveDirection(
  ownerTaxId: string,
  issuerTaxId: string | null,
  recipientTaxId: string | null,
): Direction {
  const owner = onlyDigits(ownerTaxId);
  if (owner === "") return "indefinida";
  const isIssuer = issuerTaxId !== null && onlyDigits(issuerTaxId) === owner;
  const isRecipient = recipientTaxId !== null && onlyDigits(recipientTaxId) === owner;
  if (isIssuer && !isRecipient) return "receita";
  if (isRecipient && !isIssuer) return "despesa";
  return "indefinida";
}

/**
 * Dígito verificador da chave de acesso de NF-e/NFC-e: módulo 11, com pesos de
 * 2 a 9 repetidos da direita para a esquerda sobre os 43 primeiros dígitos.
 */
export function accessKeyCheckDigit(first43: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = first43.length - 1; i >= 0; i--) {
    sum += Number(first43[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const dv = 11 - (sum % 11);
  return dv >= 10 ? 0 : dv;
}

/** Chave de acesso de NF-e/NFC-e: 44 dígitos com dígito verificador correto. */
export function isValidAccessKey(input: string): boolean {
  const d = onlyDigits(input);
  return d.length === 44 && accessKeyCheckDigit(d.slice(0, 43)) === Number(d[43]);
}
