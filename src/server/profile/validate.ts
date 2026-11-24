import { isValidCnpj, isValidISODate, type ISODate } from "@/core";

export interface ProfileInput {
  name: string;
  taxId: string;
  openingDate: string;
  email: string;
}

export type ProfileField = keyof ProfileInput;

export type ProfileCheck =
  | { ok: true; value: { name: string; taxId: string; openingDate: ISODate; email: string } }
  | { ok: false; errors: Partial<Record<ProfileField, string>> };

/** O MEI foi criado em julho de 2009; nenhuma abertura pode ser anterior. */
const MEI_FIRST_DAY = "2009-07-01";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida os dados do cadastro do MEI e os normaliza (CNPJ só com dígitos, textos aparados).
 * Cada campo com problema recebe uma mensagem específica.
 */
export function validateProfile(input: ProfileInput, today: ISODate): ProfileCheck {
  const errors: Partial<Record<ProfileField, string>> = {};

  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Informe o nome do seu MEI.";
  else if (name.length > 80) errors.name = "O nome pode ter até 80 caracteres.";

  const taxId = input.taxId.replace(/\D/g, "");
  if (taxId.length !== 14) errors.taxId = "O CNPJ tem 14 números.";
  else if (!isValidCnpj(taxId)) errors.taxId = "Este CNPJ não confere. Confira os números.";

  const openingDate = input.openingDate.trim();
  if (!isValidISODate(openingDate)) errors.openingDate = "Informe uma data válida.";
  else if (openingDate > today) errors.openingDate = "A abertura não pode ser depois de hoje.";
  else if (openingDate < MEI_FIRST_DAY) errors.openingDate = "O MEI existe desde julho de 2009.";

  const email = input.email.trim();
  if (!EMAIL.test(email) || email.length > 120) errors.email = "Informe um e-mail válido.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, taxId, openingDate, email } };
}
