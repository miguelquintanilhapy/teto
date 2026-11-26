import { describe, expect, it } from "vitest";
import { simulationView, type SimulateContext } from "./simulate";

const nb = (s: string) => s.replace(/ /g, " ");

// Os números do limite vêm prontos; a data de abertura só muda desde quando vale a saída retroativa.
const ctx: SimulateContext = { year: 2026, limitCents: 67_500_00, accumulatedCents: 60_000_00, openingDate: "2020-01-10" };

describe("simulationView", () => {
  it("sem venda, mostra quanto cabe hoje", () => {
    const v = simulationView(ctx, 0);
    expect(v.answer).toEqual({ label: "Hoje ainda cabem", cents: 7_500_00 });
    expect(v.note).toContain("Digite um valor");
    expect(v.result.additionalCostCents).toBe(0);
  });

  it("cabe com folga quando a venda não sai da faixa verde", () => {
    const v = simulationView({ ...ctx, accumulatedCents: 10_000_00 }, 1_000_00);
    expect(v.answer).toEqual({ label: "Depois desta venda, ainda cabem", cents: 56_500_00 });
    expect(v.note).toBe("Cabe com folga no limite do ano.");
    expect(v.costLine).toBeNull();
  });

  it("dentro do limite, o número é quanto ainda cabe depois da venda", () => {
    const v = simulationView(ctx, 100_00);
    expect(v.answer).toEqual({ label: "Depois desta venda, ainda cabem", cents: 7_400_00 });
    expect(v.note).toBe("Você continua em atenção.");
  });

  it("quando muda de faixa, a frase diz para onde vai", () => {
    const v = simulationView(ctx, 1_280_00); // 89% → 90,8%: atenção vira crítico
    expect(v.band.label).toBe("Crítico");
    expect(v.result.changesBand).toBe(true);
    expect(v.note).toBe("Esta venda leva você para crítico.");
  });

  it("separa atingir o limite de passar dele", () => {
    const v = simulationView(ctx, 7_500_00); // 60.000 + 7.500 = 67.500, exatamente o limite
    expect(v.band.label).toBe("Limite atingido");
    expect(v.answer.cents).toBe(0);
    expect(v.note).toContain("Qualquer venda a mais passa do limite");
    expect(nb(v.note)).toContain("R$ 81.000");
    expect(simulationView(ctx, 7_501_00).band.label).toBe("Acima do limite");
  });

  it("acima do limite, o número é quanto passa, e a frase diz o que acontece sem jargão", () => {
    const v = simulationView(ctx, 10_000_00); // 70.000: 2.500 acima do limite
    expect(v.answer).toEqual({ label: "Esta venda passa do limite em", cents: 2_500_00 });
    expect(v.note).toContain("termina 2026 como MEI");
    expect(v.note).toContain("paga imposto a mais");
    expect(v.note).toContain("vira microempresa em 1º de janeiro de 2027");
    expect(v.note).not.toContain("desenquadr");
    expect(v.costLine).toContain("estimativa");
  });

  it("acima de 20%, a saída do MEI vale desde 1º de janeiro", () => {
    const v = simulationView(ctx, 30_000_00); // 90.000: mais de 81.000
    expect(v.answer.cents).toBe(22_500_00);
    expect(v.note).toContain("deixa de ser MEI desde 1º de janeiro de 2026");
    expect(v.note).toContain("com juros e multa");
  });

  it("no ano de abertura, a saída vale desde a abertura, e não desde janeiro", () => {
    const v = simulationView({ ...ctx, openingDate: "2026-03-01" }, 30_000_00);
    expect(v.note).toContain("desde a abertura, em março");
    expect(v.note).not.toContain("janeiro");
  });

  it("calcula as proporções do medidor", () => {
    const v = simulationView(ctx, 6_750_00);
    expect(v.ratio).toBeCloseTo(66_750_00 / 67_500_00);
    expect(v.addedRatio).toBeCloseTo(0.1);
  });
});
