import { timingSafeEqual } from "node:crypto";
import { runAlerts } from "@/server/alerts/service";
import type { AlertsRepo, EmailSender } from "@/server/alerts/ports";
import type { Clock } from "@/server/clock";
import type { ProfilesRepo } from "@/server/extraction/service";
import type { TransactionsRepo } from "@/server/transactions/service";

export interface CronDeps {
  profiles: ProfilesRepo;
  transactions: TransactionsRepo;
  alerts: AlertsRepo;
  sender: EmailSender | null;
  clock: Clock;
  cronSecret: string;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Comparação em tempo constante: o tempo da resposta não revela quantos caracteres do segredo acertaram. */
export function secretsMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/cron/alerts: o cron da Vercel chama com `Authorization: Bearer <CRON_SECRET>`.
 * Sem o segredo certo, nada roda e nada é revelado.
 */
export async function handleCronAlerts(req: Request, deps: CronDeps): Promise<Response> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secretsMatch(token, deps.cronSecret)) return json({ error: "unauthorized" }, 401);

  try {
    const profile = await deps.profiles.getDemoProfile();
    if (!profile) return json({ status: "no_profile" });
    const result = await runAlerts({
      profile,
      today: deps.clock.today(),
      transactions: deps.transactions,
      alerts: deps.alerts,
      sender: deps.sender,
      now: () => new Date(deps.clock.nowMs()),
    });
    // Só o resultado: nunca o e-mail do destinatário nem o texto enviado.
    return json({ status: result.status });
  } catch (e) {
    console.error("cron de alertas falhou:", e instanceof Error ? e.message.slice(0, 200) : "erro desconhecido");
    return json({ error: "internal" }, 500);
  }
}
