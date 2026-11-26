import { describe, expect, it } from "vitest";
import { suspectedDuplicates, type DuplicateCandidate } from "./duplicates";

const base: DuplicateCandidate = {
  id: "a",
  date: "2026-04-18",
  amountCents: 2_980_00,
  kind: "receita",
  status: "confirmada",
  counterparty: "CNPJ 34.567.890/••••-••",
  description: "Doces para festa junina da escola",
};

describe("suspectedDuplicates", () => {
  it("marca os dois lançamentos iguais", () => {
    const r = suspectedDuplicates([base, { ...base, id: "b" }]);
    expect([...r].sort()).toEqual(["a", "b"]);
  });

  it("ignora diferença de maiúsculas e espaços na descrição", () => {
    const r = suspectedDuplicates([base, { ...base, id: "b", description: "  doces para FESTA junina da escola " }]);
    expect(r.size).toBe(2);
  });

  it("valor, data, tipo ou outra parte diferente não é duplicidade", () => {
    expect(suspectedDuplicates([base, { ...base, id: "b", amountCents: 2_980_01 }]).size).toBe(0);
    expect(suspectedDuplicates([base, { ...base, id: "b", date: "2026-04-19" }]).size).toBe(0);
    expect(suspectedDuplicates([base, { ...base, id: "b", kind: "despesa" }]).size).toBe(0);
    expect(suspectedDuplicates([base, { ...base, id: "b", counterparty: "CPF •••.123.456-••" }]).size).toBe(0);
  });

  it("cancelado não conta: já está fora do limite", () => {
    expect(suspectedDuplicates([base, { ...base, id: "b", status: "cancelada" }]).size).toBe(0);
  });

  it("três iguais marcam os três", () => {
    expect(suspectedDuplicates([base, { ...base, id: "b" }, { ...base, id: "c" }]).size).toBe(3);
  });
});
