import { describe, expect, it } from "vitest";
import { validateProfile, type ProfileInput } from "./validate";

const TODAY = "2026-11-24";
const ok: ProfileInput = {
  name: "  Doces   da Marta MEI ",
  taxId: "11.222.333/0001-81",
  openingDate: "2026-03-01",
  email: " marta@example.com ",
};

describe("validateProfile", () => {
  it("normaliza os dados válidos: CNPJ só com dígitos, espaços aparados", () => {
    expect(validateProfile(ok, TODAY)).toEqual({
      ok: true,
      value: { name: "Doces da Marta MEI", taxId: "11222333000181", openingDate: "2026-03-01", email: "marta@example.com" },
    });
  });

  it("dá uma mensagem específica para cada campo", () => {
    const r = validateProfile({ name: "A", taxId: "123", openingDate: "2026-02-30", email: "sem-arroba" }, TODAY);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual({
      name: "Informe o nome do seu MEI.",
      taxId: "O CNPJ tem 14 números.",
      openingDate: "Informe uma data válida.",
      email: "Informe um e-mail válido.",
    });
  });

  it("recusa CNPJ com dígito verificador errado", () => {
    const r = validateProfile({ ...ok, taxId: "11222333000182" }, TODAY);
    expect(r.ok === false && r.errors.taxId).toBe("Este CNPJ não confere. Confira os números.");
  });

  it("recusa nome com link ou e-mail, que iria parar nos alertas", () => {
    for (const name of ["Veja http://golpe.x", "www.golpe.x MEI", "fulano@golpe.x"]) {
      expect(validateProfile({ ...ok, name }, TODAY)).toMatchObject({ ok: false, errors: { name: "O nome não pode ter links nem e-mails." } });
    }
  });

  it("recusa abertura no futuro e antes da criação do MEI", () => {
    const future = validateProfile({ ...ok, openingDate: "2026-11-25" }, TODAY);
    const old = validateProfile({ ...ok, openingDate: "2009-06-30" }, TODAY);
    expect(future.ok === false && future.errors.openingDate).toContain("depois de hoje");
    expect(old.ok === false && old.errors.openingDate).toContain("2009");
  });

  it("limita o tamanho do nome e do e-mail", () => {
    expect(validateProfile({ ...ok, name: "x".repeat(81) }, TODAY).ok).toBe(false);
    expect(validateProfile({ ...ok, email: `${"a".repeat(120)}@example.com` }, TODAY).ok).toBe(false);
  });
});
