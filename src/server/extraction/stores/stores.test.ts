import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { DuplicateDocumentError } from "../service";
import { PostgresCooldownStore, PostgresQuotaGuard } from "./postgres";
import { SupabaseDocumentsRepo, SupabaseFileStorage, SupabaseProfilesRepo } from "./supabase-repos";

type Reply = { data?: unknown; error?: { message: string; code?: string; statusCode?: string } | null };

/** Cliente simulado: toda cadeia de chamadas (.from().select().eq()...) termina no mesmo resultado. */
function fakeDb(reply: Reply) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const result = { data: reply.data ?? null, error: reply.error ?? null };
  const chain: Record<string, unknown> = {};
  const record = (name: string) => (...args: unknown[]) => {
    calls.push({ method: name, args });
    return chain;
  };
  for (const m of ["from", "select", "eq", "order", "limit", "upsert", "insert"]) chain[m] = record(m);
  chain.maybeSingle = () => Promise.resolve(result);
  chain.single = () => Promise.resolve(result);
  chain.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res); // await direto na cadeia (upsert)
  chain.rpc = (name: string, params: unknown) => {
    calls.push({ method: "rpc", args: [name, params] });
    return Promise.resolve(result);
  };
  chain.storage = {
    from: () => ({
      upload: (...args: unknown[]) => {
        calls.push({ method: "upload", args });
        return Promise.resolve({ error: reply.error ?? null });
      },
    }),
  };
  return { db: chain as unknown as SupabaseClient, calls };
}

describe("PostgresCooldownStore", () => {
  it("lê o instante de bloqueio como milissegundos", async () => {
    const { db } = fakeDb({ data: { blocked_until: "2026-11-24T12:00:00.000Z" } });
    expect(await new PostgresCooldownStore(db).blockedUntil("gemini:x")).toBe(Date.parse("2026-11-24T12:00:00.000Z"));
  });

  it("devolve null quando o provedor não está bloqueado", async () => {
    expect(await new PostgresCooldownStore(fakeDb({ data: null }).db).blockedUntil("gemini:x")).toBeNull();
  });

  it("grava o bloqueio com data ISO e motivo limitado", async () => {
    const { db, calls } = fakeDb({});
    await new PostgresCooldownStore(db).block("gemini:x", Date.parse("2026-11-24T12:00:00.000Z"), "x".repeat(500));
    const up = calls.find((c) => c.method === "upsert")!.args[0] as Record<string, string>;
    expect(up.provider_id).toBe("gemini:x");
    expect(up.blocked_until).toBe("2026-11-24T12:00:00.000Z");
    expect(up.reason).toHaveLength(200);
  });

  it("propaga erros do banco (o roteador decide o que fazer)", async () => {
    const { db } = fakeDb({ error: { message: "boom" } });
    await expect(new PostgresCooldownStore(db).blockedUntil("a")).rejects.toThrow(/cooldown: boom/);
    await expect(new PostgresCooldownStore(db).block("a", 1, "r")).rejects.toThrow(/cooldown: boom/);
  });
});

describe("PostgresQuotaGuard", () => {
  it("chama a função atômica do banco com o dia e o limite", async () => {
    const { db, calls } = fakeDb({ data: true });
    expect(await new PostgresQuotaGuard(db, 300).tryConsume("2026-11-24")).toBe(true);
    expect(calls.find((c) => c.method === "rpc")!.args).toEqual(["consume_daily_quota", { p_day: "2026-11-24", p_limit: 300 }]);
  });

  it("devolve false quando o teto foi atingido e só aceita true literal", async () => {
    expect(await new PostgresQuotaGuard(fakeDb({ data: false }).db, 1).tryConsume("2026-11-24")).toBe(false);
    expect(await new PostgresQuotaGuard(fakeDb({ data: null }).db, 1).tryConsume("2026-11-24")).toBe(false);
  });

  it("propaga erro do banco", async () => {
    await expect(new PostgresQuotaGuard(fakeDb({ error: { message: "x" } }).db, 1).tryConsume("2026-11-24")).rejects.toThrow(/quota: x/);
  });
});

describe("repositórios do Supabase", () => {
  const NEW_DOC = { profileId: "p", storagePath: "p/h.png", contentHash: "h", mimeType: "image/png", sizeBytes: 9, kind: "nota" as const };

  it("converte violação de unicidade em DuplicateDocumentError", async () => {
    const { db } = fakeDb({ error: { message: "duplicate key", code: "23505" } });
    await expect(new SupabaseDocumentsRepo(db).insert(NEW_DOC)).rejects.toBeInstanceOf(DuplicateDocumentError);
  });

  it("outros erros de inserção seguem como erro comum", async () => {
    const { db } = fakeDb({ error: { message: "falhou", code: "XX000" } });
    await expect(new SupabaseDocumentsRepo(db).insert(NEW_DOC)).rejects.toThrow(/documents: falhou/);
  });

  it("mapeia a linha do banco para o registro do documento", async () => {
    const row = { id: "d1", profile_id: "p", storage_path: "p/h.png", content_hash: "h", mime_type: "image/png", size_bytes: 9, kind: "nota" };
    const found = await new SupabaseDocumentsRepo(fakeDb({ data: row }).db).findByHash("p", "h");
    expect(found).toEqual({ id: "d1", ...NEW_DOC });
  });

  it("o perfil de demonstração é o mais antigo; null se não existir", async () => {
    expect(await new SupabaseProfilesRepo(fakeDb({ data: { id: "abc" } }).db).getDemoProfileId()).toBe("abc");
    expect(await new SupabaseProfilesRepo(fakeDb({ data: null }).db).getDemoProfileId()).toBeNull();
  });

  it("gravar de novo o mesmo arquivo no storage não é erro; outros erros são", async () => {
    const dup = fakeDb({ error: { message: "The resource already exists", statusCode: "409" } });
    await expect(new SupabaseFileStorage(dup.db).put("p/h.png", new Uint8Array(1), "image/png")).resolves.toBeUndefined();

    const bad = fakeDb({ error: { message: "bucket not found", statusCode: "404" } });
    await expect(new SupabaseFileStorage(bad.db).put("p/h.png", new Uint8Array(1), "image/png")).rejects.toThrow(/storage: bucket not found/);
  });
});
