import { describe, expect, it } from "vitest";
import { buildDashboard, type Transaction } from "@/core";
import { rulesGuide } from "./rules-guide";

const nb = (s: string) => s.replace(/ /g, " ");

const rev = (cents: number): Transaction => ({ id: "a", date: "2026-03-10", amountCents: cents, kind: "receita", status: "confirmada" });

const dash = (cents: number, openingDate: string) =>
  buildDashboard({ transactions: cents > 0 ? [rev(cents)] : [], today: "2026-11-24", openingDate });

describe("rulesGuide", () => {
  it("mostra a conta do limite proporcional no ano de abertura", () => {
    const g = rulesGuide(dash(0, "2026-03-01"), "2026-03-01");
    expect(nb(g.limitMath)).toBe("R$ 6.750 por mês de atividade × 10 meses. Sua empresa abriu em março de 2026, então o limite deste ano é proporcional.");
  });

  it("no ano cheio, a conta é de 12 meses", () => {
    const g = rulesGuide(dash(0, "2020-01-10"), "2020-01-10");
    expect(nb(g.limitMath)).toBe("R$ 6.750 por mês × 12 meses.");
  });

  it("descreve as três faixas com o que acontece na prática, sem jargão", () => {
    const g = rulesGuide(dash(0, "2026-03-01"), "2026-03-01");
    expect(g.ladder.map((s) => nb(s.range))).toEqual(["Até R$ 67.500", "De R$ 67.500 a R$ 81.000", "Acima de R$ 81.000"]);
    const text = g.ladder.flatMap((s) => s.points).join(" ");
    expect(text).not.toContain("desenquadr");
    expect(text).toContain("Vira microempresa (ME) em 1º de janeiro de 2027");
    expect(text).toContain("avisar a Receita até o último dia útil do mês seguinte");
    expect(g.ladder[2]!.points[0]).toContain("desde a abertura, em março");
  });

  it("fora do ano de abertura, a saída retroativa vale desde 1º de janeiro", () => {
    const g = rulesGuide(dash(0, "2020-01-10"), "2020-01-10");
    expect(g.ladder[2]!.points[0]).toContain("desde 1º de janeiro de 2026");
  });

  it("marca em qual faixa o faturamento de hoje está", () => {
    expect(rulesGuide(dash(59_000_00, "2026-03-01"), "2026-03-01").ladder.map((s) => s.current)).toEqual([true, false, false]);
    expect(rulesGuide(dash(70_000_00, "2026-03-01"), "2026-03-01").ladder.map((s) => s.current)).toEqual([false, true, false]);
    expect(rulesGuide(dash(90_000_00, "2026-03-01"), "2026-03-01").ladder.map((s) => s.current)).toEqual([false, false, true]);
  });

  it("dá o valor de cada aviso, truncado", () => {
    const g = rulesGuide(dash(0, "2026-03-01"), "2026-03-01");
    expect(g.warnings.map((w) => nb(w.value))).toEqual(["R$ 54.000", "R$ 60.750", "R$ 67.500"]);
    expect(g.dasDueDay).toBe(20);
  });
});
