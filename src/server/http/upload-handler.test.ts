import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryDocumentsRepo, InMemoryExtractionsRepo, InMemoryFileStorage, InMemoryProfilesRepo } from "@/server/extraction/memory";
import { AllProvidersFailedError, type ExtractionResult } from "@/server/extraction/router";
import { QuotaExceededError } from "@/server/extraction/quota";
import type { ExtractedReceipt } from "@/server/extraction/schema";
import type { Extractor } from "@/server/extraction/service";
import { MAX_UPLOAD_BYTES } from "@/server/upload/validate";
import { handleUpload, type UploadHandlerDeps } from "./upload-handler";

const GOOD: ExtractedReceipt = {
  documentType: "comprovante_pix",
  issueDate: "2026-05-10",
  totalCents: 300_00,
  issuerTaxId: "11.222.333/0001-81",
  recipientTaxId: null,
  accessKey: null,
  description: "Pix",
  confidence: 0.9,
};

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

const result: ExtractionResult = {
  status: "accepted",
  data: GOOD,
  issues: [],
  providerId: "gemini:flash-lite",
  attempts: [
    { providerId: "gemini:flash-lite", outcome: "accepted", latencyMs: 1234 },
  ],
};

function makeDeps(opts: { profile?: string | null; extract?: Extractor["extract"] } = {}): UploadHandlerDeps {
  return {
    profiles: new InMemoryProfilesRepo(opts.profile === undefined ? "p1" : opts.profile),
    upload: {
      documents: new InMemoryDocumentsRepo(),
      extractions: new InMemoryExtractionsRepo(),
      storage: new InMemoryFileStorage(),
      extractor: { extract: opts.extract ?? (async () => result) },
    },
  };
}

function post(fields: Record<string, string | File>): Request {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request("http://localhost/api/documents", { method: "POST", body: form });
}
const pngFile = (name = "nota.png") => new File([PNG], name, { type: "image/png" });

describe("POST /api/documents", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => errorSpy.mockRestore());

  it("extrai e devolve só o que a interface precisa, com o rastro das tentativas", async () => {
    const res = await handleUpload(post({ file: pngFile(), kind: "nota" }), makeDeps());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.status).toBe("extracted");
    expect(body.extraction.data).toMatchObject({ totalCents: 300_00, issuerTaxId: "11.222.333/0001-81" });
    expect(body.extraction.trace).toEqual([
      { providerId: "gemini:flash-lite", outcome: "accepted", latencyMs: 1234, errorKind: null, issues: [] },
    ]);
    expect(body.document).toEqual({ id: expect.any(String), kind: "nota" });
    // não vaza dados internos
    expect(JSON.stringify(body)).not.toMatch(/storagePath|contentHash|profileId|promptVersion/);
  });

  it("assume kind=nota quando não informado", async () => {
    const body = await (await handleUpload(post({ file: pngFile() }), makeDeps())).json();
    expect(body.document.kind).toBe("nota");
  });

  it("marca o reenvio do mesmo arquivo como duplicado, sem nova chamada de IA", async () => {
    const extract = vi.fn(async () => result);
    const deps = makeDeps({ extract });
    await handleUpload(post({ file: pngFile() }), deps);
    const second = await (await handleUpload(post({ file: pngFile("outro-nome.png") }), deps)).json();
    expect(second.status).toBe("duplicate");
    expect(extract).toHaveBeenCalledTimes(1);
  });

  it("400 sem arquivo, com multipart inválido ou com kind desconhecido", async () => {
    const none = await handleUpload(post({ kind: "nota" }), makeDeps());
    expect(none.status).toBe(400);
    expect((await none.json()).error).toBe("missing_file");

    const notForm = await handleUpload(
      new Request("http://localhost/api/documents", { method: "POST", body: "texto", headers: { "content-type": "text/plain" } }),
      makeDeps(),
    );
    expect(notForm.status).toBe(400);

    const badKind = await handleUpload(post({ file: pngFile(), kind: "cheque" }), makeDeps());
    expect(badKind.status).toBe(400);
    expect((await badKind.json()).error).toBe("invalid_kind");
  });

  it("415 para formato não suportado, mesmo com nome e tipo enganosos", async () => {
    const fake = new File(["<script>alert(1)</script>"], "nota.png", { type: "image/png" });
    const res = await handleUpload(post({ file: fake }), makeDeps());
    expect(res.status).toBe(415);
    expect((await res.json()).error).toBe("unsupported_type");
  });

  it("413 para arquivo grande demais, antes de processar", async () => {
    const extract = vi.fn(async () => result);
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "grande.png", { type: "image/png" });
    const res = await handleUpload(post({ file: big }), makeDeps({ extract }));
    expect(res.status).toBe(413);
    expect(extract).not.toHaveBeenCalled();
  });

  it("413 quando o Content-Length já declara um corpo enorme", async () => {
    const req = new Request("http://localhost/api/documents", {
      method: "POST",
      headers: { "content-length": String(MAX_UPLOAD_BYTES * 5) },
      body: new FormData(),
    });
    expect((await handleUpload(req, makeDeps())).status).toBe(413);
  });

  it("503 com mensagem útil se o perfil de demonstração não existe", async () => {
    const res = await handleUpload(post({ file: pngFile() }), makeDeps({ profile: null }));
    expect(res.status).toBe(503);
    expect((await res.json()).message).toMatch(/npm run seed/);
  });

  it("cota esgotada ou todos os modelos fora: 200 com entrada manual (não é erro do usuário)", async () => {
    const quota = await (
      await handleUpload(post({ file: pngFile() }), makeDeps({ extract: async () => { throw new QuotaExceededError(); } }))
    ).json();
    expect(quota).toMatchObject({ status: "manual_entry", reason: "quota_exceeded", extraction: null });

    const down = await (
      await handleUpload(
        post({ file: pngFile() }),
        makeDeps({ extract: async () => { throw new AllProvidersFailedError([{ providerId: "a", outcome: "error", errorKind: "unavailable", latencyMs: 3 }]); } }),
      )
    ).json();
    expect(down).toMatchObject({ status: "manual_entry", reason: "all_providers_failed", extraction: { status: "failed" } });
    expect(down.extraction.trace[0]).toMatchObject({ providerId: "a", errorKind: "unavailable" });
  });

  it("500 genérico em erro inesperado, sem vazar detalhes nem a mensagem interna", async () => {
    const res = await handleUpload(
      post({ file: pngFile() }),
      makeDeps({ extract: async () => { throw new Error("SEGREDO-INTERNO connection string"); } }),
    );
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toMatch(/SEGREDO-INTERNO/);
    expect(JSON.parse(text).error).toBe("internal");
    expect(errorSpy).toHaveBeenCalled(); // o detalhe vai só para o log
  });
});
