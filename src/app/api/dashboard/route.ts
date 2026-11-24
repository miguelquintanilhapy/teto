import { getTransactionsDeps } from "@/server/composition";
import { handleDashboard } from "@/server/http/transactions-handler";

export async function GET(request: Request): Promise<Response> {
  let deps;
  try {
    deps = getTransactionsDeps();
  } catch (e) {
    console.error(e instanceof Error ? e.message : "configuração inválida");
    return Response.json(
      { error: "misconfigured", message: "O servidor não está configurado corretamente." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  return handleDashboard(request, deps);
}
