import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { triggerAlerts } from "@/server/alerts/trigger";
import { getAlertsDeps, getTransactionsDeps } from "@/server/composition";
import { PANEL_TAG } from "@/server/panel-cache";
import { handleConfirm, handleList, type TransactionsHandlerDeps } from "@/server/http/transactions-handler";

function deps(): TransactionsHandlerDeps | Response {
  try {
    return getTransactionsDeps();
  } catch (e) {
    // Configuração inválida: a causa vai para o log, e não para o cliente.
    console.error(e instanceof Error ? e.message : "configuração inválida");
    return Response.json(
      { error: "misconfigured", message: "O servidor não está configurado corretamente." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const d = deps();
  if (d instanceof Response) return d;
  const res = await handleConfirm(request, d);
  // Um lançamento novo muda o painel: descarta o cache já, sem servir o número antigo.
  if (res.status === 201) {
    revalidateTag(PANEL_TAG, { expire: 0 });
    // Depois de responder: se o limite acabou de cruzar uma faixa, avisa por e-mail (uma vez por faixa).
    after(async () => {
      try {
        await triggerAlerts(getAlertsDeps());
      } catch (e) {
        console.error("alertas: configuração", e instanceof Error ? e.message.slice(0, 120) : "erro");
      }
    });
  }
  return res;
}

export async function GET(request: Request): Promise<Response> {
  const d = deps();
  return d instanceof Response ? d : handleList(request, d);
}
