/**
 * Lê o corpo JSON de uma requisição com defesas baratas: exige `application/json` (um formulário de
 * outro site só consegue enviar `text/plain` sem pedir permissão), confere o tamanho de verdade
 * (e não só o `Content-Length`, que pode faltar) e devolve erro claro para JSON quebrado.
 */
export type JsonBody = { ok: true; value: unknown } | { ok: false; response: Response };

const fail = (error: string, message: string, status: number): JsonBody => ({
  ok: false,
  response: Response.json({ error, message }, { status, headers: { "Cache-Control": "no-store" } }),
});

export async function readJsonBody(req: Request, maxBytes: number): Promise<JsonBody> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return fail("unsupported_media_type", "Envie o corpo como application/json.", 415);
  }
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return fail("too_large", "Pedido grande demais.", 413);

  let text: string;
  try {
    text = await req.text();
  } catch {
    return fail("invalid_json", "Envie um JSON válido.", 400);
  }
  if (new TextEncoder().encode(text).byteLength > maxBytes) return fail("too_large", "Pedido grande demais.", 413);
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return fail("invalid_json", "Envie um JSON válido.", 400);
  }
}
