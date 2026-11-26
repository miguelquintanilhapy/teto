import { describe, expect, it } from "vitest";
import { roofDots } from "./roof";

describe("roofDots", () => {
  const roof = { left: 10, right: 94, base: 32, peak: 5.4 };

  it("põe um ponto em cada ponta e um no topo", () => {
    const dots = roofDots(roof, 5);
    expect(dots).toHaveLength(11);
    expect(dots[0]).toEqual([10, 32]);
    expect(dots[5]).toEqual([52, 5.4]);
    expect(dots[10]).toEqual([94, 32]);
  });

  it("espelha o lado direito no esquerdo", () => {
    const dots = roofDots(roof, 5);
    for (let i = 0; i < dots.length; i++) {
      const [x, y] = dots[i];
      const [mx, my] = dots[dots.length - 1 - i];
      expect(x - roof.left).toBeCloseTo(roof.right - mx);
      expect(y).toBeCloseTo(my);
    }
  });

  it("espaça os pontos por igual", () => {
    const dots = roofDots(roof, 5);
    const gaps = dots.slice(1).map(([x, y], i) => Math.hypot(x - dots[i][0], y - dots[i][1]));
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 1);
  });
});
