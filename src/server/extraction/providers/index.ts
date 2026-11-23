import type { Env } from "@/server/env";
import type { CooldownStore } from "../cooldown";
import type { FetchLike } from "../http";
import type { VisionProvider } from "../provider";
import type { QuotaGuard } from "../quota";
import { ExtractionRouter } from "../router";
import { createGeminiProvider } from "./gemini";
import { createOpenRouterProvider } from "./openrouter";

type ProviderEnv = Pick<Env, "modelChain" | "geminiApiKey" | "openrouterApiKey">;

/** Monta os provedores na ordem de `MODEL_CHAIN`. */
export function buildProviders(env: ProviderEnv, fetchImpl?: FetchLike): VisionProvider[] {
  return env.modelChain.map(({ provider, model }) => {
    if (provider === "gemini") {
      if (!env.geminiApiKey) throw new Error("GEMINI_API_KEY ausente");
      return createGeminiProvider({ apiKey: env.geminiApiKey, model, fetch: fetchImpl });
    }
    if (!env.openrouterApiKey) throw new Error("OPENROUTER_API_KEY ausente");
    return createOpenRouterProvider({
      apiKey: env.openrouterApiKey,
      model,
      fetch: fetchImpl,
      title: "Teto",
    });
  });
}

export interface RouterDeps {
  cooldownStore?: CooldownStore;
  quota?: QuotaGuard;
  fetch?: FetchLike;
}

export function createRouterFromEnv(env: ProviderEnv, deps: RouterDeps = {}): ExtractionRouter {
  return new ExtractionRouter({
    providers: buildProviders(env, deps.fetch),
    cooldownStore: deps.cooldownStore,
    quota: deps.quota,
  });
}
