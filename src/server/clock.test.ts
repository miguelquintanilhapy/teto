import { describe, expect, it } from "vitest";
import { fixedClock, todayInSaoPaulo } from "./clock";

describe("todayInSaoPaulo", () => {
  it("usa o dia de Brasília, não o de UTC", () => {
    // 02:00 UTC do dia 12 ainda é 23:00 do dia 11 em Brasília (UTC-3)
    expect(todayInSaoPaulo(new Date("2026-05-12T02:00:00Z"))).toBe("2026-05-11");
    expect(todayInSaoPaulo(new Date("2026-05-12T03:00:00Z"))).toBe("2026-05-12");
  });

  it("vira o ano na hora de Brasília", () => {
    expect(todayInSaoPaulo(new Date("2027-01-01T02:59:00Z"))).toBe("2026-12-31");
    expect(todayInSaoPaulo(new Date("2027-01-01T03:00:00Z"))).toBe("2027-01-01");
  });

  it("fixedClock devolve sempre o mesmo instante", () => {
    const c = fixedClock("2026-05-12T15:00:00Z");
    expect(c.today()).toBe("2026-05-12");
    expect(c.nowMs()).toBe(Date.parse("2026-05-12T15:00:00Z"));
  });
});
