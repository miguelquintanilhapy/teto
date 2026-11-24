import { describe, expect, it } from "vitest";
import { sha256 } from "@/server/hash";
import { InMemoryDocumentsRepo, InMemoryExtractionsRepo, InMemoryFileStorage } from "./memory";
import { PROMPT_VERSION } from "./prompt";
import { QuotaExceededError } from "./quota";
import { AllProvidersFailedError, type ExtractionResult } from "./router";
import type { ExtractedReceipt } from "./schema";
import {
  DuplicateDocumentError,
  processUpload,
  type DocumentsRepo,
  type Extractor,
  type NewDocument,
  type UploadDeps,
} from "./service";

const PROFILE = "11111111-1111-1111-1111-111111111111";
const png = (marker: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, marker]);

const GOOD: ExtractedReceipt = {
  documentType: "nota_fiscal",
  issueDate: "2026-05-10",
  totalCents: 150_00,
  issuerTaxId: "11.222.333/0001-81",
  recipientTaxId: null,
  accessKey: null,
  description: "Bolo",
  confidence: 0.95,
};

const ok = (status: ExtractionResult["status"] = "accepted"): ExtractionResult => ({
  status,
  data: GOOD,
  issues: status === "accepted" ? [] : ["confiança baixa"],
  providerId: "gemini:flash-lite",
  attempts: [{ providerId: "gemini:flash-lite", outcome: "accepted", latencyMs: 900 }],
});

function setup(behavior: () => Promise<ExtractionResult>) {
  const documents = new InMemoryDocumentsRepo();
  const extractions = new InMemoryExtractionsRepo();
  const storage = new InMemoryFileStorage();
  const calls = { n: 0 };
  const extractor: Extractor = {
    extract: async () => {
      calls.n += 1;
      return behavior();
    },
  };
  const deps: UploadDeps = { documents, extractions, storage, extractor };
  return { deps, documents, extractions, storage, calls };
}

describe("processUpload", () => {
  it("recusa arquivo inválido sem guardar nada nem chamar a IA", async () => {
    const t = setup(async () => ok());
    const r = await processUpload({ profileId: PROFILE, bytes: new TextEncoder().encode("oi"), kind: "nota" }, t.deps);
    expect(r).toMatchObject({ status: "rejected", code: "unsupported_type" });
    expect(t.calls.n).toBe(0);
    expect(t.storage.files.size).toBe(0);
    expect(t.documents.rows).toHaveLength(0);
  });

  it("guarda o arquivo pelo hash, extrai e registra o rastro e as versões", async () => {
    const t = setup(async () => ok());
    const bytes = png(1);
    const r = await processUpload({ profileId: PROFILE, bytes, kind: "nota" }, t.deps);

    expect(r.status).toBe("extracted");
    if (r.status !== "extracted") return;
    const path = `${PROFILE}/${sha256(bytes)}.png`;
    expect(t.storage.files.get(path)?.mimeType).toBe("image/png");
    expect(r.document).toMatchObject({ profileId: PROFILE, storagePath: path, kind: "nota", sizeBytes: bytes.byteLength });
    expect(r.extraction).toMatchObject({
      status: "accepted",
      providerId: "gemini:flash-lite",
      promptVersion: PROMPT_VERSION,
      schemaVersion: "2",
      rawResult: GOOD,
    });
    expect(r.extraction.attempts).toHaveLength(1);
  });

  it("propaga needs_review com os problemas encontrados", async () => {
    const t = setup(async () => ok("needs_review"));
    const r = await processUpload({ profileId: PROFILE, bytes: png(2), kind: "recibo" }, t.deps);
    expect(r).toMatchObject({ status: "extracted", issues: ["confiança baixa"], extraction: { status: "needs_review" } });
  });

  it("é idempotente: o mesmo arquivo nunca é extraído duas vezes", async () => {
    const t = setup(async () => ok());
    const first = await processUpload({ profileId: PROFILE, bytes: png(3), kind: "nota" }, t.deps);
    const second = await processUpload({ profileId: PROFILE, bytes: png(3), kind: "nota" }, t.deps);

    expect(first.status).toBe("extracted");
    expect(second.status).toBe("duplicate");
    expect(t.calls.n).toBe(1);
    expect(t.documents.rows).toHaveLength(1);
    expect(t.storage.files.size).toBe(1);
  });

  it("o mesmo arquivo de outro perfil é outro documento", async () => {
    const t = setup(async () => ok());
    await processUpload({ profileId: PROFILE, bytes: png(4), kind: "nota" }, t.deps);
    const other = await processUpload({ profileId: "22222222-2222-2222-2222-222222222222", bytes: png(4), kind: "nota" }, t.deps);
    expect(other.status).toBe("extracted");
    expect(t.calls.n).toBe(2);
    expect(t.documents.rows).toHaveLength(2);
  });

  it("se todos os modelos falham, grava a falha e pede entrada manual; reenviar tenta de novo no mesmo documento", async () => {
    let fail = true;
    const t = setup(async () => {
      if (fail) throw new AllProvidersFailedError([{ providerId: "a", outcome: "error", errorKind: "unavailable", latencyMs: 5 }]);
      return ok();
    });
    const first = await processUpload({ profileId: PROFILE, bytes: png(5), kind: "nota" }, t.deps);
    expect(first).toMatchObject({ status: "manual_entry", reason: "all_providers_failed", extraction: { status: "failed", rawResult: null } });

    fail = false;
    const retry = await processUpload({ profileId: PROFILE, bytes: png(5), kind: "nota" }, t.deps);
    expect(retry.status).toBe("extracted");
    expect(t.documents.rows).toHaveLength(1); // reaproveitou o documento
    expect(t.extractions.rows.get(t.documents.rows[0]!.id)?.status).toBe("accepted"); // substituiu a falha
  });

  it("com a cota do dia esgotada, guarda o documento e pede entrada manual sem gravar extração", async () => {
    let exhausted = true;
    const t = setup(async () => {
      if (exhausted) throw new QuotaExceededError();
      return ok();
    });
    const r = await processUpload({ profileId: PROFILE, bytes: png(6), kind: "nota" }, t.deps);
    expect(r).toMatchObject({ status: "manual_entry", reason: "quota_exceeded", extraction: null });
    expect(t.documents.rows).toHaveLength(1);
    expect(t.extractions.rows.size).toBe(0);

    exhausted = false; // dia seguinte
    expect((await processUpload({ profileId: PROFILE, bytes: png(6), kind: "nota" }, t.deps)).status).toBe("extracted");
  });

  it("upload simultâneo do mesmo arquivo: usa o documento que chegou primeiro", async () => {
    const t = setup(async () => ok());
    const bytes = png(7);
    const racing: DocumentsRepo = {
      findByHash: (p, h) => t.documents.findByHash(p, h),
      insert: async (doc: NewDocument) => {
        await t.documents.insert(doc); // o outro upload grava antes
        throw new DuplicateDocumentError();
      },
    };
    const r = await processUpload({ profileId: PROFILE, bytes, kind: "nota" }, { ...t.deps, documents: racing });
    expect(r.status).toBe("extracted");
    expect(t.documents.rows).toHaveLength(1);
  });

  it("não engole erros inesperados do extrator", async () => {
    const t = setup(async () => {
      throw new Error("bug inesperado");
    });
    await expect(processUpload({ profileId: PROFILE, bytes: png(8), kind: "nota" }, t.deps)).rejects.toThrow("bug inesperado");
  });

  it("respeita o limite de tamanho configurado", async () => {
    const t = setup(async () => ok());
    const r = await processUpload({ profileId: PROFILE, bytes: png(9), kind: "nota" }, { ...t.deps, maxBytes: 4 });
    expect(r).toMatchObject({ status: "rejected", code: "too_large" });
  });
});
