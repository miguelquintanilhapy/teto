import { describe, expect, it } from "vitest";
import { barGeometry } from "./limit-geometry";

describe("barGeometry", () => {
  it("só até o limite: o usado e o acrescentado somam o total", () => {
    const g = barGeometry(0.9, 0.1, 1);
    expect(g.base).toBeCloseTo(0.8);
    expect(g.added).toBeCloseTo(0.1);
    expect(g.limitAt).toBe(1);
  });

  it("o já faturado não encolhe quando a venda passa do limite", () => {
    // 83% já faturados + 22% de venda = 105%: antes a barra mostrava só 78% de usado
    const g = barGeometry(1.05, 0.22, 1.2);
    expect(g.base).toBeCloseTo(0.83 / 1.2);
    expect(g.base + g.added).toBeCloseTo(1.05 / 1.2);
    expect(g.limitAt).toBeCloseTo(1 / 1.2);
  });

  it("acima do fim da escala, a barra enche e o usado continua inteiro", () => {
    const g = barGeometry(1.6, 0.5, 1.2);
    expect(g.base).toBeCloseTo(1.1 / 1.2);
    expect(g.base + g.added).toBeCloseTo(1);
  });

  it("já acima da escala antes da venda: o usado ocupa tudo e o novo não aparece", () => {
    const g = barGeometry(1.5, 0.1, 1.2);
    expect(g.base).toBeCloseTo(1);
    expect(g.added).toBe(0);
  });

  it("valores estranhos não quebram a barra", () => {
    expect(barGeometry(Number.NaN, 0, 1)).toEqual({ base: 0, added: 0, limitAt: 1 });
    expect(barGeometry(-1, -1, 1)).toEqual({ base: 0, added: 0, limitAt: 1 });
    expect(barGeometry(0.5, 0, 0).limitAt).toBe(1);
  });
});
