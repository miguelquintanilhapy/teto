import { getTransactionsDeps } from "@/server/composition";
import { loadPanel, type PanelData } from "@/server/panel";

export type PanelResult = { ok: true; panel: PanelData } | { ok: false; reason: "error" | "no_profile" };

/**
 * Lê o painel sem deixar a tela quebrar: a causa de uma falha vai para o log do servidor
 * (só a mensagem, cortada), e a tela recebe um motivo para explicar ao usuário.
 */
export async function loadPanelSafe(where: string): Promise<PanelResult> {
  try {
    const panel = await loadPanel(getTransactionsDeps());
    return panel ? { ok: true, panel } : { ok: false, reason: "no_profile" };
  } catch (e) {
    console.error(`${where}: falha ao carregar`, e instanceof Error ? e.message.slice(0, 200) : "erro desconhecido");
    return { ok: false, reason: "error" };
  }
}
