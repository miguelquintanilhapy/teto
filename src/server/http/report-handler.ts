import { yearOf } from "@/core";
import { transactionsToCsv } from "@/lib/report";
import type { Clock } from "@/server/clock";
import type { ProfilesRepo } from "@/server/extraction/service";
import type { TransactionsRepo } from "@/server/transactions/service";

export interface ReportHandlerDeps {
  profiles: ProfilesRepo;
  transactions: TransactionsRepo;
  clock: Clock;
}

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** GET /api/report: baixa os lançamentos do ano em CSV. */
export async function handleReport(deps: ReportHandlerDeps): Promise<Response> {
  try {
    const profile = await deps.profiles.getDemoProfile();
    if (!profile) return json({ error: "no_profile", message: "Cadastre o MEI antes de baixar o relatório." }, 503);
    const year = yearOf(deps.clock.today());
    const rows = await deps.transactions.listByYear(profile.id, year);
    const csv = transactionsToCsv(rows);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="teto-lancamentos-${year}.csv"`,
        // Dado financeiro: nunca em cache, e o navegador não adivinha o tipo do arquivo.
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("relatório falhou:", e instanceof Error ? e.message.slice(0, 200) : "erro desconhecido");
    return json({ error: "internal", message: "Não foi possível gerar o relatório agora." }, 500);
  }
}
