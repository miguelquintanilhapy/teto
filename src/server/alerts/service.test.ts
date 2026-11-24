import { describe, expect, it } from "vitest";
import { InMemoryTransactionsRepo } from "@/server/transactions/memory";
import { FakeEmailSender, InMemoryAlertsRepo } from "./memory";
import { runAlerts } from "./service";

const PROFILE = { id: "p1", name: "Doces da Marta MEI", taxId: "11222333000181", openingDate: "2026-03-01", email: "marta@example.com" };
const TODAY = "2026-11-24";
const NOW = () => new Date("2026-11-24T15:00:00Z");

async function setup(revenueCents: number) {
  const transactions = new InMemoryTransactionsRepo();
  if (revenueCents > 0) {
    await transactions.insert({
      profileId: "p1", documentId: null, date: "2026-10-01", issueDate: null, amountCents: revenueCents, kind: "receita",
      source: "manual", status: "confirmada", counterpartyTaxId: null, accessKey: null, description: "x", confidence: null,
    });
  }
  const alerts = new InMemoryAlertsRepo();
  const sender = new FakeEmailSender();
  const run = (over: { sender?: FakeEmailSender | null } = {}) =>
    runAlerts({ profile: PROFILE, today: TODAY, transactions, alerts, sender: over.sender === undefined ? sender : over.sender, now: NOW });
  return { transactions, alerts, sender, run };
}

describe("runAlerts", () => {
  it("não faz nada abaixo de 80% do limite", async () => {
    const { run, sender, alerts } = await setup(10_000_00);
    expect(await run()).toEqual({ status: "nothing_due" });
    expect(sender.sent).toHaveLength(0);
    expect(alerts.rows).toHaveLength(0);
  });

  it("envia um e-mail ao cruzar 80% e não repete na rodada seguinte", async () => {
    const { run, sender } = await setup(55_000_00); // 81,5% de 67.500
    expect(await run()).toMatchObject({ status: "sent", kind: "threshold_warning", suppressed: [] });
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]).toMatchObject({ to: "marta@example.com" });
    expect(await run()).toEqual({ status: "nothing_due" });
    expect(sender.sent).toHaveLength(1); // idempotente
  });

  it("quando várias faixas ficam pendentes juntas, só o mais grave vira e-mail", async () => {
    const { run, sender, alerts } = await setup(70_000_00); // passou do limite de uma vez
    const r = await run();
    expect(r).toMatchObject({ status: "sent", kind: "over_limit" });
    expect(r.status === "sent" && r.suppressed.sort()).toEqual(["threshold_critical", "threshold_warning"]);
    expect(sender.sent).toHaveLength(1);
    expect(alerts.rows.every((a) => a.sentAt !== null)).toBe(true);
  });

  it("sem chave de e-mail, registra e deixa pendente, sem enviar", async () => {
    const { run, alerts } = await setup(55_000_00);
    expect(await run({ sender: null })).toMatchObject({ status: "not_configured", pending: ["threshold_warning"] });
    expect(alerts.rows[0]!.sentAt).toBeNull();
  });

  it("se o envio falha, mantém pendente e tenta de novo na próxima rodada", async () => {
    const { run, sender, alerts } = await setup(55_000_00);
    sender.fail = true;
    expect(await run()).toMatchObject({ status: "failed", reason: "resend: HTTP 500" });
    expect(alerts.rows[0]!.sentAt).toBeNull();
    sender.fail = false;
    expect(await run()).toMatchObject({ status: "sent" });
  });

  it("um alerta de faixa mais alta depois de um já enviado gera novo e-mail", async () => {
    const { run, sender, transactions } = await setup(55_000_00);
    await run();
    await transactions.insert({
      profileId: "p1", documentId: null, date: "2026-11-02", issueDate: null, amountCents: 8_000_00, kind: "receita",
      source: "manual", status: "confirmada", counterpartyTaxId: null, accessKey: null, description: "y", confidence: null,
    }); // 63.000: 93%
    expect(await run()).toMatchObject({ status: "sent", kind: "threshold_critical" });
    expect(sender.sent).toHaveLength(2);
  });
});
