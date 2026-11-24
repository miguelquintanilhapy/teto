import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeEmailSender, InMemoryAlertsRepo } from "@/server/alerts/memory";
import { fixedClock } from "@/server/clock";
import { InMemoryProfilesRepo } from "@/server/extraction/memory";
import { InMemoryTransactionsRepo } from "@/server/transactions/memory";
import { handleCronAlerts, secretsMatch } from "./cron-handler";

const SECRET = "segredo-de-teste-com-mais-de-16";

async function setup(revenue = 55_000_00, profile: string | null = "p1") {
  const transactions = new InMemoryTransactionsRepo();
  await transactions.insert({
    profileId: "p1", documentId: null, date: "2026-10-01", issueDate: null, amountCents: revenue, kind: "receita",
    source: "manual", status: "confirmada", counterpartyTaxId: null, accessKey: null, description: "x", confidence: null,
  });
  const sender = new FakeEmailSender();
  return {
    sender,
    deps: {
      profiles: new InMemoryProfilesRepo(profile, { openingDate: "2026-03-01" }),
      transactions,
      alerts: new InMemoryAlertsRepo(),
      sender,
      clock: fixedClock("2026-11-24T15:00:00Z"),
      cronSecret: SECRET,
    },
  };
}

const req = (auth?: string) => new Request("http://localhost/api/cron/alerts", { headers: auth ? { authorization: auth } : {} });

describe("secretsMatch", () => {
  it("só aceita o segredo exato", () => {
    expect(secretsMatch(SECRET, SECRET)).toBe(true);
    expect(secretsMatch("outro", SECRET)).toBe(false);
    expect(secretsMatch("", SECRET)).toBe(false);
    expect(secretsMatch(SECRET + "x", SECRET)).toBe(false);
  });
});

describe("GET /api/cron/alerts", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => errorSpy.mockRestore());

  it("recusa sem o segredo, com segredo errado e sem o prefixo Bearer, e não executa nada", async () => {
    const { deps, sender } = await setup();
    for (const auth of [undefined, "Bearer errado", SECRET, "Basic " + SECRET]) {
      const res = await handleCronAlerts(req(auth), deps);
      expect(res.status).toBe(401);
    }
    expect(sender.sent).toHaveLength(0);
  });

  it("com o segredo certo, dispara o alerta e devolve só o resultado", async () => {
    const { deps, sender } = await setup();
    const res = await handleCronAlerts(req(`Bearer ${SECRET}`), deps);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ status: "sent" });
    expect(text).not.toContain("marta@example.com");
    expect(sender.sent).toHaveLength(1);
  });

  it("rodar de novo não manda outro e-mail", async () => {
    const { deps, sender } = await setup();
    await handleCronAlerts(req(`Bearer ${SECRET}`), deps);
    await handleCronAlerts(req(`Bearer ${SECRET}`), deps);
    expect(sender.sent).toHaveLength(1);
  });

  it("responde sem erro quando não há cadastro", async () => {
    const { deps } = await setup(55_000_00, null);
    const res = await handleCronAlerts(req(`Bearer ${SECRET}`), deps);
    expect(await res.json()).toEqual({ status: "no_profile" });
  });

  it("não devolve o erro interno", async () => {
    const { deps } = await setup();
    deps.transactions.listByYear = async () => {
      throw new Error("string de conexão 10.0.0.7");
    };
    const res = await handleCronAlerts(req(`Bearer ${SECRET}`), deps);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("10.0.0.7");
  });
});
