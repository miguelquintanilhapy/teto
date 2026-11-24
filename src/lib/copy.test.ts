import { describe, expect, it } from "vitest";
import { buildDashboard, type Transaction } from "@/core";
import { bandView, daysUntilLabel, forecastView } from "./copy";

const nb = (s: string) => s.replace(/ /g, " ");

const rev = (id: string, date: string, cents: number): Transaction => ({
  id,
  date,
  amountCents: cents,
  kind: "receita",
  status: "confirmada",
});

const dash = (list: Transaction[], today = "2026-11-24") =>
  buildDashboard({ transactions: list, today, openingDate: "2026-03-01" });

describe("bandView", () => {
  it("dá um texto a cada faixa, e nunca só uma cor", () => {
    expect(bandView("ok")).toEqual({ label: "Dentro do limite", tone: "ok" });
    expect(bandView("attention").label).toBe("Atenção");
    expect(bandView("critical").tone).toBe("danger");
    expect(bandView("over_tolerance").label).toBe("Acima do limite");
    expect(bandView("over_retroactive").label).toBe("Acima de 20%");
  });
});

describe("forecastView", () => {
  it("avisa quando ainda não há receita confirmada", () => {
    const f = forecastView(dash([]));
    expect(f.headline).toBe("Ainda não há receita confirmada em 2026.");
  });

  it("prevê o dia em que o limite será ultrapassado", () => {
    // 60.000 em 269 dias desde 1/3: ritmo de ~223 por dia, limite de 67.500 em 28/12
    const f = forecastView(dash([rev("a", "2026-03-10", 30_000_00), rev("b", "2026-11-05", 30_000_00)]));
    expect(f.headline).toBe("Você deve passar do limite em 28 de dezembro.");
    expect(nb(f.body)).toContain("2026 fecha em R$ 68.253");
    expect(f.body).toContain("Até 20% acima você segue MEI neste ano.");
  });

  it("diz que o limite já foi ultrapassado e quanto passou", () => {
    const f = forecastView(dash([rev("a", "2026-03-10", 70_000_00)]));
    expect(f.headline).toBe("Você já passou do limite de 2026.");
    expect(nb(f.body)).toContain("O excesso é de R$ 2.500");
    expect(f.body).toContain("1º de janeiro de 2027");
  });

  it("avisa do desenquadramento retroativo acima de 20%", () => {
    const f = forecastView(dash([rev("a", "2026-03-10", 90_000_00)]));
    expect(f.body).toContain("desenquadramento vale desde janeiro");
  });

  it("diz que termina o ano dentro do limite quando o ritmo permite", () => {
    const f = forecastView(dash([rev("a", "2026-03-10", 10_000_00)], "2026-06-30"));
    expect(f.headline).toBe("No ritmo atual, você termina 2026 dentro do limite.");
  });
});

describe("daysUntilLabel", () => {
  it("escreve prazos curtos", () => {
    expect(daysUntilLabel(26)).toBe("em 26 dias");
    expect(daysUntilLabel(1)).toBe("amanhã");
    expect(daysUntilLabel(0)).toBe("vence hoje");
  });
});
