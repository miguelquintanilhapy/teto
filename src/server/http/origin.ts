/**
 * Defesa contra requisições forjadas de outros sites (CSRF) nas rotas que gravam dados.
 * Navegadores sempre mandam `Origin` em POST, PUT e PATCH entre origens: se vier e não for a nossa,
 * é outro site tentando usar o navegador do usuário. Chamadas sem `Origin` (curl, servidor, cron)
 * passam, porque não carregam credenciais de navegador. Isto NÃO substitui autenticação.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin === null) return true;
  if (origin === "null") return false; // iframe com sandbox ou arquivo local
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return host !== null && o.host === host;
  } catch {
    return false;
  }
}

export const FORBIDDEN_ORIGIN = () =>
  Response.json(
    { error: "forbidden_origin", message: "Origem não permitida." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
