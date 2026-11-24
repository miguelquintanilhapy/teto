import type { AlertsRepo, EmailSender } from "./ports";
import { runAlerts } from "./service";
import type { Clock } from "@/server/clock";
import type { ProfilesRepo } from "@/server/extraction/service";
import type { TransactionsRepo } from "@/server/transactions/service";

/**
 * Roda os alertas depois de um lançamento mudar o faturamento. Nunca lança nem atrasa a resposta
 * de quem confirmou: falha vira uma linha de log, e o cron diário tenta de novo.
 */
export async function triggerAlerts(deps: {
  profiles: ProfilesRepo;
  transactions: TransactionsRepo;
  alerts: AlertsRepo;
  sender: EmailSender | null;
  clock: Clock;
}): Promise<void> {
  try {
    const profile = await deps.profiles.getDemoProfile();
    if (!profile) return;
    const r = await runAlerts({
      profile,
      today: deps.clock.today(),
      transactions: deps.transactions,
      alerts: deps.alerts,
      sender: deps.sender,
      now: () => new Date(deps.clock.nowMs()),
    });
    if (r.status !== "nothing_due") console.info("alertas:", r.status);
  } catch (e) {
    console.error("alertas: falha ao disparar", e instanceof Error ? e.message.slice(0, 200) : "erro desconhecido");
  }
}
