import { getAlertsDeps } from "@/server/composition";
import { handleCronAlerts } from "@/server/http/cron-handler";

export async function GET(request: Request): Promise<Response> {
  let deps;
  try {
    deps = getAlertsDeps();
  } catch (e) {
    console.error(e instanceof Error ? e.message : "configuração inválida");
    return Response.json(
      { error: "misconfigured" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  return handleCronAlerts(request, deps);
}
