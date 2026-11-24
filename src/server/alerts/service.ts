import { buildDashboard, yearOf, type AlertKind, type ISODate } from "@/core";
import type { ProfileRecord } from "@/server/extraction/service";
import { toCore, type TransactionsRepo } from "@/server/transactions/service";
import { buildAlertEmail, mostSevere } from "./email";
import type { AlertsRepo, EmailSender } from "./ports";

export type RunAlertsResult =
  | { status: "nothing_due" }
  | { status: "sent"; kind: AlertKind; suppressed: AlertKind[] }
  /** Há alerta devido, mas não há chave de e-mail: fica registrado e sai quando configurarem. */
  | { status: "not_configured"; pending: AlertKind[] }
  | { status: "failed"; pending: AlertKind[]; reason: string };

/**
 * Dispara o alerta do limite, no máximo um e-mail por rodada e uma vez por faixa e por ano.
 * Idempotente: pode rodar a cada confirmação e a cada cron. Quando várias faixas ficam pendentes de uma
 * vez (de 70% para 120%, por exemplo), só a mais grave vira e-mail e as outras são marcadas como enviadas.
 * Nunca lança: o chamador só precisa do resultado.
 */
export async function runAlerts(input: {
  profile: ProfileRecord;
  today: ISODate;
  transactions: TransactionsRepo;
  alerts: AlertsRepo;
  sender: EmailSender | null;
  now: () => Date;
}): Promise<RunAlertsResult> {
  const { profile, today, transactions, alerts, sender } = input;
  const year = yearOf(today);

  const rows = await transactions.listByYear(profile.id, year);
  const dash = buildDashboard({ transactions: rows.map(toCore), today, openingDate: profile.openingDate });
  if (dash.alerts.length === 0) return { status: "nothing_due" };

  for (const kind of dash.alerts) await alerts.ensure(profile.id, kind, year);
  const stored = await alerts.list(profile.id, year);
  const pending = stored.filter((a) => a.sentAt === null && dash.alerts.includes(a.kind)).map((a) => a.kind);
  if (pending.length === 0) return { status: "nothing_due" };
  if (!sender) return { status: "not_configured", pending };

  const kind = mostSevere(pending)!;
  const crossing = dash.projection.limitCrossing.status === "projected" ? dash.projection.limitCrossing.date : null;
  const email = buildAlertEmail(kind, {
    profileName: profile.name,
    year,
    accumulatedCents: dash.accumulatedCents,
    limitCents: dash.limitCents,
    toleranceLimitCents: dash.toleranceLimitCents,
    projectedCrossing: crossing,
  });

  try {
    await sender.send({ to: profile.email, ...email });
  } catch (e) {
    return { status: "failed", pending, reason: e instanceof Error ? e.message.slice(0, 120) : "erro" };
  }
  await alerts.markSent(profile.id, pending, year, input.now().toISOString());
  return { status: "sent", kind, suppressed: pending.filter((k) => k !== kind) };
}
