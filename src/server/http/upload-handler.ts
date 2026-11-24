import { z } from "zod";
import { processUpload, type ExtractionRecord, type ProfilesRepo, type UploadDeps, type UploadOutcome } from "@/server/extraction/service";
import { MAX_UPLOAD_BYTES } from "@/server/upload/validate";

export interface UploadHandlerDeps {
  profiles: ProfilesRepo;
  upload: UploadDeps;
}

const KindSchema = z.enum(["nota", "recibo", "extrato"]);

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const TOO_LARGE = {
  error: "too_large",
  message: `O arquivo passa do limite de ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
};

/** Só o que a interface precisa. Nada de dados internos do banco. */
function viewExtraction(e: ExtractionRecord) {
  return {
    id: e.id,
    status: e.status,
    providerId: e.providerId,
    data: e.rawResult,
    // Rastro de cada tentativa: alimenta "lida pelo modelo X em 1,2 s, 1 escalonamento".
    trace: e.attempts.map((a) => ({
      providerId: a.providerId,
      outcome: a.outcome,
      latencyMs: a.latencyMs,
      errorKind: a.errorKind ?? null,
      issues: a.issues ?? [],
    })),
  };
}

function respond(outcome: UploadOutcome): Response {
  switch (outcome.status) {
    case "rejected": {
      const status = outcome.code === "too_large" ? 413 : outcome.code === "unsupported_type" ? 415 : 400;
      return json({ error: outcome.code, message: outcome.message }, status);
    }
    case "duplicate":
      return json({
        status: "duplicate",
        document: { id: outcome.document.id, kind: outcome.document.kind },
        extraction: viewExtraction(outcome.extraction),
      });
    case "extracted":
      return json({
        status: "extracted",
        document: { id: outcome.document.id, kind: outcome.document.kind },
        extraction: viewExtraction(outcome.extraction),
        issues: outcome.issues,
      });
    case "manual_entry":
      // 200 de propósito: não é um erro do usuário. A interface abre o formulário manual.
      return json({
        status: "manual_entry",
        reason: outcome.reason,
        document: { id: outcome.document.id, kind: outcome.document.kind },
        extraction: outcome.extraction ? viewExtraction(outcome.extraction) : null,
      });
  }
}

/** POST /api/documents: multipart com `file` (obrigatório) e `kind` (nota, recibo ou extrato). */
export async function handleUpload(req: Request, deps: UploadHandlerDeps): Promise<Response> {
  // Barreira barata antes de ler o corpo (o multipart acrescenta algum overhead).
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES + 100_000) return json(TOO_LARGE, 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "invalid_request", message: "Envie o arquivo como multipart/form-data." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "missing_file", message: "Envie um arquivo no campo \"file\"." }, 400);
  }
  const kind = KindSchema.safeParse(form.get("kind") ?? "nota");
  if (!kind.success) {
    return json({ error: "invalid_kind", message: "O campo \"kind\" deve ser nota, recibo ou extrato." }, 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) return json(TOO_LARGE, 413);

  try {
    const profileId = await deps.profiles.getDemoProfileId();
    if (!profileId) {
      return json({ error: "no_profile", message: "Perfil de demonstração não configurado. Rode npm run seed." }, 503);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    return respond(await processUpload({ profileId, bytes, kind: kind.data }, deps.upload));
  } catch (e) {
    // Nunca devolve o erro interno ao cliente. No log, só a mensagem, sem o conteúdo do arquivo.
    console.error("upload falhou:", e instanceof Error ? `${e.name}: ${e.message.slice(0, 200)}` : "erro desconhecido");
    return json({ error: "internal", message: "Não foi possível processar o arquivo agora." }, 500);
  }
}
