import { describe, expect, it } from "vitest";
import { buildAlertEmail, mostSevere, type AlertContext } from "./email";
import { ResendEmailSender } from "./resend";

const nb = (s: string) => s.replace(/ /g, " ");

const ctx: AlertContext = {
  profileName: "Doces da Marta MEI",
  year: 2026,
  accumulatedCents: 60_000_00,
  limitCents: 67_500_00,
  toleranceLimitCents: 81_000_00,
  openingDate: "2020-01-10",
  projectedCrossing: "2026-12-28",
};

describe("buildAlertEmail", () => {
  it("avisa a faixa de atenção com o que ainda cabe e a data prevista", () => {
    const e = buildAlertEmail("threshold_warning", ctx);
    expect(e.subject).toBe("Teto: você já usou 88% do limite do MEI"); // 60.000 de 67.500 = 88,9%, truncado
    expect(nb(e.text)).toContain("Ainda cabem R$ 7.500");
    expect(e.text).toContain("28 de dezembro");
  });

  it("explica o estouro dentro e fora da tolerância", () => {
    const over = buildAlertEmail("over_limit", { ...ctx, accumulatedCents: 70_000_00 });
    expect(nb(over.text)).toContain("passou do limite de 2026 em R$ 2.500");
    expect(over.text).toContain("1º de janeiro de 2027");
    const retro = buildAlertEmail("over_tolerance", { ...ctx, accumulatedCents: 90_000_00 });
    expect(retro.text).toContain("desde 1º de janeiro de 2026");
    const aberto = buildAlertEmail("over_tolerance", { ...ctx, accumulatedCents: 90_000_00, openingDate: "2026-03-01" });
    expect(aberto.text).toContain("desde a abertura, em março");
  });

  it("escapa o conteúdo no HTML, por mais estranho que seja o nome", () => {
    const e = buildAlertEmail("threshold_warning", { ...ctx, profileName: '<script>alert("x")</script> & Cia' });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).toContain("&amp; Cia");
  });

  it("sempre diz que são estimativas", () => {
    expect(buildAlertEmail("threshold_critical", ctx).text).toContain("Estimativas");
  });
});

describe("mostSevere", () => {
  it("escolhe o alerta mais grave", () => {
    expect(mostSevere(["threshold_warning", "over_limit", "threshold_critical"])).toBe("over_limit");
    expect(mostSevere([])).toBeNull();
  });
});

describe("ResendEmailSender", () => {
  const email = { to: "marta@example.com", subject: "S", text: "T", html: "<p>T</p>" };

  it("envia com a chave no cabeçalho e o destinatário em lista", async () => {
    let seen: { url: string; init?: RequestInit } | null = null;
    const sender = new ResendEmailSender("re_chave_secreta", "Teto <a@b.c>", async (url, init) => {
      seen = { url, init };
      return new Response("{}", { status: 200 });
    });
    await sender.send(email);
    expect(seen!.url).toBe("https://api.resend.com/emails");
    expect((seen!.init!.headers as Record<string, string>).Authorization).toBe("Bearer re_chave_secreta");
    expect(JSON.parse(seen!.init!.body as string)).toMatchObject({ from: "Teto <a@b.c>", to: ["marta@example.com"], subject: "S" });
  });

  it("falha sem vazar a chave nem o destinatário", async () => {
    const sender = new ResendEmailSender("re_chave_secreta", "Teto <a@b.c>", async () => new Response("destinatário marta@example.com inválido", { status: 422 }));
    const err = await sender.send(email).catch((e: Error) => e);
    expect((err as Error).message).toBe("resend: HTTP 422");
    expect((err as Error).message).not.toContain("marta");
    expect((err as Error).message).not.toContain("re_chave");
  });

  it("falha com mensagem limpa se a rede cair", async () => {
    const sender = new ResendEmailSender("re_chave_secreta", "x", async () => {
      throw new TypeError("fetch failed https://api.resend.com?key=re_chave_secreta");
    });
    const err = (await sender.send(email).catch((e: Error) => e)) as Error;
    expect(err.message).toBe("resend: sem resposta (TypeError)");
  });
});
