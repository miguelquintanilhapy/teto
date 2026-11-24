import { getTransactionsDeps } from "@/server/composition";
import { handleReport } from "@/server/http/report-handler";

export async function GET(): Promise<Response> {
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
  return handleReport(deps);
}
