import { getTransactionsDeps } from "@/server/composition";
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
  return d instanceof Response ? d : handleConfirm(request, d);
}

export async function GET(request: Request): Promise<Response> {
  const d = deps();
  return d instanceof Response ? d : handleList(request, d);
}
