import { revalidateTag } from "next/cache";
import { AI_TAG } from "@/server/ai/load";
import { getUploadHandlerDeps } from "@/server/composition";
import { handleUpload } from "@/server/http/upload-handler";

// Com `cacheComponents` ligado, o Next 16 não aceita `runtime` nem `dynamic` aqui:
// o runtime já é Node e a resposta de um POST nunca é cacheada.

/** A cadeia de modelos tem orçamento de 40 s; deixa folga para o upload e o banco. */
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  let deps;
  try {
    deps = getUploadHandlerDeps();
  } catch (e) {
    // Configuração inválida (variável faltando): explica ao desenvolvedor no log, e não ao cliente.
    console.error(e instanceof Error ? e.message : "configuração inválida");
    return Response.json(
      { error: "misconfigured", message: "O servidor não está configurado corretamente." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  const res = await handleUpload(request, deps);
  // Uma leitura nova entra nas métricas da tela de transparência da IA.
  if (res.status === 200) revalidateTag(AI_TAG, { expire: 0 });
  return res;
}
