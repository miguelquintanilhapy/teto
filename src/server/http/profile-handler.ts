import { z } from "zod";
import type { Clock } from "@/server/clock";
import type { ProfilesRepo } from "@/server/extraction/service";
import { readJsonBody } from "./json-body";
import { validateProfile } from "@/server/profile/validate";

export interface ProfileHandlerDeps {
  profiles: ProfilesRepo;
  clock: Clock;
  /** Falso em produção por padrão: o primeiro cadastro sempre pode, mas mudar um cadastro existente não. */
  allowEdit: boolean;
}

const MAX_BODY_BYTES = 5_000;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** `.strict()`: campo desconhecido é erro. O cliente só envia os quatro campos do cadastro. */
const Body = z
  .object({
    name: z.string().max(200),
    taxId: z.string().max(30),
    openingDate: z.string().max(10),
    email: z.string().max(200),
  })
  .strict();

/** PUT /api/profile: cadastra o MEI (primeiro uso) ou atualiza os dados. */
export async function handleSaveProfile(req: Request, deps: ProfileHandlerDeps): Promise<Response> {
  const body = await readJsonBody(req, MAX_BODY_BYTES);
  if (!body.ok) return body.response;
  const raw = body.value;
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return json({ error: "invalid_body", message: "Dados inválidos.", issues }, 400);
  }

  const check = validateProfile(parsed.data, deps.clock.today());
  if (!check.ok) return json({ error: "invalid_profile", message: "Confira os campos destacados.", fields: check.errors }, 422);

  try {
    if (!deps.allowEdit && (await deps.profiles.getDemoProfileId()) !== null) {
      return json({ error: "edit_disabled", message: "A edição do perfil está desativada neste ambiente." }, 403);
    }
    await deps.profiles.saveDemoProfile(check.value);
    // Só a confirmação: o CNPJ e o e-mail não voltam na resposta.
    return json({ status: "saved" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "erro desconhecido";
    if (message.includes("CNPJ já está cadastrado")) {
      return json({ error: "duplicate_tax_id", message: "Este CNPJ já está cadastrado.", fields: { taxId: "Este CNPJ já está cadastrado." } }, 409);
    }
    console.error("perfil: falha ao salvar", message.slice(0, 200));
    return json({ error: "internal", message: "Não foi possível salvar agora." }, 500);
  }
}
