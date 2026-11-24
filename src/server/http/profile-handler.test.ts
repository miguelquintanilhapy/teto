import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixedClock } from "@/server/clock";
import { InMemoryProfilesRepo } from "@/server/extraction/memory";
import { handleSaveProfile } from "./profile-handler";

const deps = (id: string | null = null) => ({
  profiles: new InMemoryProfilesRepo(id),
  clock: fixedClock("2026-11-24T15:00:00Z"),
});

const put = (body: unknown) =>
  new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const valid = { name: "Doces da Marta MEI", taxId: "11.222.333/0001-81", openingDate: "2026-03-01", email: "marta@example.com" };

describe("PUT /api/profile", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => errorSpy.mockRestore());

  it("cadastra o MEI no primeiro uso e normaliza o CNPJ", async () => {
    const d = deps(null);
    const res = await handleSaveProfile(put(valid), d);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).profile).toMatchObject({ taxId: "11222333000181", name: "Doces da Marta MEI" });
    expect(await d.profiles.getDemoProfile()).toMatchObject({ taxId: "11222333000181" });
  });

  it("atualiza o cadastro que já existe", async () => {
    const d = deps("p1");
    await handleSaveProfile(put({ ...valid, name: "Bolos da Marta" }), d);
    expect((await d.profiles.getDemoProfile())?.name).toBe("Bolos da Marta");
  });

  it("devolve o erro de cada campo, com 422", async () => {
    const res = await handleSaveProfile(put({ ...valid, taxId: "123", email: "x" }), deps());
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.fields).toMatchObject({ taxId: "O CNPJ tem 14 números.", email: "Informe um e-mail válido." });
  });

  it("recusa campo desconhecido, como id ou perfil", async () => {
    expect((await handleSaveProfile(put({ ...valid, id: "outro" }), deps())).status).toBe(400);
    expect((await handleSaveProfile(put({ ...valid, profileId: "outro" }), deps())).status).toBe(400);
  });

  it("recusa JSON quebrado e corpo grande demais", async () => {
    expect((await handleSaveProfile(put("{x"), deps())).status).toBe(400);
    const big = new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json", "content-length": "99999" },
      body: JSON.stringify(valid),
    });
    expect((await handleSaveProfile(big, deps())).status).toBe(413);
  });

  it("não devolve o erro interno ao cliente quando o banco falha", async () => {
    const d = deps();
    d.profiles.saveDemoProfile = async () => {
      throw new Error("conexão recusada em 10.0.0.5");
    };
    const res = await handleSaveProfile(put(valid), d);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("10.0.0.5");
  });

  it("avisa quando o CNPJ já pertence a outro cadastro", async () => {
    const d = deps();
    d.profiles.saveDemoProfile = async () => {
      throw new Error("profiles: este CNPJ já está cadastrado");
    };
    const res = await handleSaveProfile(put(valid), d);
    expect(res.status).toBe(409);
  });
});
