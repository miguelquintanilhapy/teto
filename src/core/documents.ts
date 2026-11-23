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

/** Chave de acesso de NF-e/NFC-e: 44 dígitos. */
export function isValidAccessKey(input: string): boolean {
  return /^\d{44}$/.test(onlyDigits(input)) && onlyDigits(input).length === 44;
}
