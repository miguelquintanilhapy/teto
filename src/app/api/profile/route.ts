import { revalidateTag } from "next/cache";
import { getTransactionsDeps } from "@/server/composition";
import { handleSaveProfile } from "@/server/http/profile-handler";
import { FORBIDDEN_ORIGIN, isSameOrigin } from "@/server/http/origin";
import { PANEL_TAG } from "@/server/panel-cache";

export async function PUT(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return FORBIDDEN_ORIGIN();
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
  const res = await handleSaveProfile(request, deps);
  // O perfil define o limite e o tipo das notas: descarta o cache do painel já.
  if (res.status === 200) revalidateTag(PANEL_TAG, { expire: 0 });
  return res;
}
