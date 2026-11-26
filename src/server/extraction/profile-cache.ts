import type { ProfileRecord, ProfilesRepo } from "./service";

/**
 * Guarda por alguns minutos o **id** do perfil da demonstração. O upload só precisa do id, que nunca muda depois
 * de criado, e buscá-lo a cada envio custa uma ida e volta ao banco. Só guarda quando existe: "ainda não há perfil"
 * nunca fica em cache, para o cadastro novo valer na hora. O resto passa direto.
 */
export class CachedProfileIdRepo implements ProfilesRepo {
  private cached: { id: string; at: number } | null = null;

  constructor(
    private readonly inner: ProfilesRepo,
    private readonly ttlMs = 5 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  async getDemoProfileId(): Promise<string | null> {
    if (this.cached && this.now() - this.cached.at < this.ttlMs) return this.cached.id;
    const id = await this.inner.getDemoProfileId();
    this.cached = id ? { id, at: this.now() } : null;
    return id;
  }

  getDemoProfile(): Promise<ProfileRecord | null> {
    return this.inner.getDemoProfile();
  }

  async saveDemoProfile(input: Omit<ProfileRecord, "id">): Promise<ProfileRecord> {
    const saved = await this.inner.saveDemoProfile(input);
    this.cached = { id: saved.id, at: this.now() };
    return saved;
  }
}
