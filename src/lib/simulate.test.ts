import { describe, expect, it } from "vitest";
import { simulationView, type SimulateContext } from "./simulate";

const nb = (s: string) => s.replace(/ /g, " ");

const ctx: SimulateContext = { year: 2026, limitCents: 67_500_00, accumulatedCents: 60_000_00 };

describe("simulationView", () => {
  it("diz que cabe quando a venda não muda a faixa", () => {
    const v = simulationView({ ...ctx, accumulatedCents: 10_000_00 }, 1_000_00);
    expect(v.headline).toBe("Cabe no limite.");
    expect(nb(v.detail)).toBe("Depois dela, ainda sobram R$ 56.500 no ano.");
    expect(v.costLine).toBeNull();
  });

  it("avisa quando a venda muda a faixa de risco", () => {
    const v = simulationView(ctx, 1_280_00); // 89% → 90,8%: atenção vira crítico
    expect(v.band.label).toBe("Crítico");
    expect(v.headline).toBe("Esta venda leva você para crítico.");
    expect(v.result.changesBand).toBe(true);
  });

  it("diz que continua na mesma faixa quando nada muda", () => {
    const v = simulationView(ctx, 100_00);
    expect(v.headline).toBe("Você continua em atenção.");
  });

  it("explica o estouro dentro da tolerância e estima o custo, sempre como estimativa", () => {
    const v = simulationView(ctx, 10_000_00); // 70.000: 2.500 acima do limite
    expect(nb(v.headline)).toBe("Esta venda passa do limite em R$ 2.500.");
    expect(v.detail).toContain("desenquadrado em 1º de janeiro de 2027");
    expect(v.costLine).toContain("estimativa");
    expect(v.result.additionalCostCents).toBeGreaterThan(0);
  });

  it("explica o desenquadramento retroativo acima de 20%", () => {
    const v = simulationView(ctx, 30_000_00); // 90.000: mais de 81.000
    expect(v.headline).toBe("Esta venda passa de 20% acima do limite.");
    expect(v.detail).toContain("desde janeiro de 2026");
  });

  it("separa atingir o limite de passar dele", () => {
    const v = simulationView(ctx, 7_500_00); // 60.000 + 7.500 = 67.500, exatamente o limite
    expect(v.band.label).toBe("Limite atingido");
    expect(v.headline).toBe("Esta venda usa todo o limite.");
    expect(v.detail).toContain("Qualquer venda a mais passa do limite");
    expect(nb(v.detail)).toContain("R$ 81.000");
    expect(simulationView(ctx, 7_501_00).band.label).toBe("Acima do limite");
  });

  it("mostra as duas referências e o que sobra até cada uma", () => {
    const v = simulationView(ctx, 100_00);
    expect(nb(v.references)).toBe("Limite R$ 67.500 · com 20% a mais: R$ 81.000");
    expect(nb(v.detail)).toContain("sobram R$ 7.400 até o limite e R$ 20.900 até o teto de 20% acima");
  });

  it("pede o valor quando ainda não há venda", () => {
    expect(simulationView(ctx, 0).result.additionalCostCents).toBe(0);
  });

  it("calcula as proporções do medidor", () => {
    const v = simulationView(ctx, 6_750_00);
    expect(v.ratio).toBeCloseTo(66_750_00 / 67_500_00);
    expect(v.addedRatio).toBeCloseTo(0.1);
  });
});
