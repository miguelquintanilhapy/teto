import { revalidateTag } from "next/cache";
import { getTransactionsDeps } from "@/server/composition";
import { handleChange } from "@/server/http/transactions-handler";
import { PANEL_TAG } from "@/server/panel-cache";

export async function PATCH(request: Request, ctx: RouteContext<"/api/transactions/[id]">): Promise<Response> {
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
  const { id } = await ctx.params;
  const res = await handleChange(request, id, deps);
  // Cancelar ou corrigir muda o painel: descarta o cache já, sem servir o número antigo.
  if (res.status === 200) revalidateTag(PANEL_TAG, { expire: 0 });
  return res;
}
