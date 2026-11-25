import { describe, expect, it } from "vitest";
import { CachedProfileIdRepo } from "./profile-cache";
import type { ProfileRecord, ProfilesRepo } from "./service";

const PROFILE: ProfileRecord = { id: "p1", name: "Doces", taxId: "11222333000181", openingDate: "2026-03-01", email: "a@b.com" };

function fakeRepo(initial: string | null) {
  const repo = {
    id: initial,
    idCalls: 0,
    async getDemoProfileId() {
      repo.idCalls += 1;
      return repo.id;
    },
    async getDemoProfile() {
      return repo.id ? { ...PROFILE, id: repo.id } : null;
    },
    async saveDemoProfile(input: Omit<ProfileRecord, "id">) {
      repo.id = "p-novo";
      return { ...input, id: "p-novo" };
    },
  };
  return repo satisfies ProfilesRepo & { id: string | null; idCalls: number };
}

describe("CachedProfileIdRepo", () => {
  it("busca o id uma vez e reaproveita dentro do prazo", async () => {
    const inner = fakeRepo("p1");
    let t = 0;
    const repo = new CachedProfileIdRepo(inner, 1_000, () => t);
    expect(await repo.getDemoProfileId()).toBe("p1");
    t = 999;
    expect(await repo.getDemoProfileId()).toBe("p1");
    expect(inner.idCalls).toBe(1);
  });

  it("busca de novo depois do prazo", async () => {
    const inner = fakeRepo("p1");
    let t = 0;
    const repo = new CachedProfileIdRepo(inner, 1_000, () => t);
    await repo.getDemoProfileId();
    t = 1_000;
    await repo.getDemoProfileId();
    expect(inner.idCalls).toBe(2);
  });

  it("nunca guarda a ausência de perfil: o cadastro novo vale na hora", async () => {
    const inner = fakeRepo(null);
    const repo = new CachedProfileIdRepo(inner, 60_000, () => 0);
    expect(await repo.getDemoProfileId()).toBeNull();
    inner.id = "p1";
    expect(await repo.getDemoProfileId()).toBe("p1");
    expect(inner.idCalls).toBe(2);
  });

  it("salvar o perfil atualiza o id guardado", async () => {
    const inner = fakeRepo("p1");
    const repo = new CachedProfileIdRepo(inner, 60_000, () => 0);
    await repo.getDemoProfileId();
    await repo.saveDemoProfile({ name: "N", taxId: "11222333000181", openingDate: "2026-03-01", email: "x@y.com" });
    expect(await repo.getDemoProfileId()).toBe("p-novo");
    expect(inner.idCalls).toBe(1);
  });

  it("o perfil completo sempre vem do banco", async () => {
    const inner = fakeRepo("p1");
    const repo = new CachedProfileIdRepo(inner);
    expect((await repo.getDemoProfile())?.name).toBe("Doces");
  });
});
