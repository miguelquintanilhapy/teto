import { describe, expect, it } from "vitest";
import { buildDashboard, type Transaction } from "@/core";
import { bandAdvice, bandView, dasCompetence, daysUntilLabel, forecastView, limitExplainer, paceLine, pendingAria, pendingLabel } from "./copy";

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
    expect(bandView("critical").tone).toBe("alert");
    expect(bandView("over_tolerance").tone).toBe("danger");
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

describe("cartão de notas", () => {
  it("não diz que está tudo conferido quando só não há nota", () => {
    expect(pendingLabel(0)).toBe("nenhuma pendente");
    expect(pendingAria(0)).toBe("Nenhuma nota para conferir");
    expect(pendingAria(1)).toBe("1 nota para conferir");
    expect(pendingAria(3)).toBe("3 notas para conferir");
  });
});

describe("bandAdvice", () => {
  it("só orienta quando há o que fazer", () => {
    expect(bandAdvice("ok")).toBeNull();
    expect(bandAdvice("attention")).toContain("simule");
    expect(bandAdvice("critical")).toContain("contador");
    expect(bandAdvice("over_tolerance")).toContain("desenquadramento");
  });
});

describe("dasCompetence", () => {
  it("o DAS que vence em dezembro é de novembro, e o de janeiro é de dezembro", () => {
    expect(dasCompetence("2026-12-20")).toBe("novembro");
    expect(dasCompetence("2027-01-20")).toBe("dezembro");
  });
});

describe("paceLine", () => {
  it("diz a média por mês e desde quando, no ano de abertura", () => {
    const d = dash([rev("a", "2026-03-10", 60_000_00)]);
    const line = paceLine(d, "2026-03-01")!;
    expect(line).toContain("desde a abertura, em março");
    expect(line).toContain("A previsão muda a cada nova receita.");
  });

  it("conta desde janeiro nos demais anos e se cala sem receita", () => {
    const d = buildDashboard({ transactions: [rev("a", "2026-02-10", 10_000_00)], today: "2026-06-30", openingDate: "2020-01-10" });
    expect(paceLine(d, "2020-01-10")).toContain("desde janeiro");
    expect(paceLine(dash([]), "2026-03-01")).toBeNull();
  });
});

describe("limitExplainer", () => {
  it("explica as três faixas e o limite proporcional", () => {
    const rows = limitExplainer(dash([]), "2026-03-01");
    expect(rows.map((r) => r.title)).toEqual(["Limite do ano", "Até 20% acima", "Acima disso"]);
    expect(rows[0]!.text).toContain("abriu em março");
    expect(rows[0]!.text).toContain("10 meses");
    expect(nb(rows[1]!.value)).toBe("R$ 81.000");
    expect(rows[1]!.text).toContain("1º de janeiro de 2027");
    expect(rows[2]!.text).toContain("desde a abertura");
  });

  it("no ano completo, o limite é o anual", () => {
    const d = buildDashboard({ transactions: [], today: "2026-06-30", openingDate: "2020-01-10" });
    const rows = limitExplainer(d, "2020-01-10");
    expect(rows[0]!.text).toContain("anual completo");
    expect(rows[2]!.text).toContain("desde janeiro de 2026");
  });
});
