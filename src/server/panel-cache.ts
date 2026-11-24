import { cacheLife, cacheTag } from "next/cache";
import { getTransactionsDeps } from "@/server/composition";
import { loadPanel, type PanelData } from "@/server/panel";
import type { TransactionEvent } from "@/server/transactions/service";

/** Etiqueta que invalida o painel quando um lançamento muda. */
export const PANEL_TAG = "panel";

/**
 * O painel em cache. É o que deixa a troca de abas instantânea: o roteador do navegador
 * reaproveita a tela por `stale` segundos sem pedir nada ao servidor, e o servidor só
 * volta ao banco depois de `revalidate` segundos ou quando um lançamento é confirmado
 * (a rota de confirmação chama `revalidateTag`). Um erro nunca é guardado em cache.
 *
 * Hoje há um único perfil de demonstração, então a chave é fixa. Com várias contas, o
 * identificador do usuário entra como argumento e passa a fazer parte da chave.
 */
export async function getPanel(): Promise<PanelData | null> {
  "use cache";
  cacheTag(PANEL_TAG);
  cacheLife({ stale: 60, revalidate: 30, expire: 3600 });
  return loadPanel(getTransactionsDeps());
}

/** Histórico de alterações de um lançamento, no mesmo cache e com a mesma etiqueta do painel. */
export async function getTransactionEvents(id: string): Promise<TransactionEvent[]> {
  "use cache";
  cacheTag(PANEL_TAG);
  cacheLife({ stale: 60, revalidate: 30, expire: 3600 });
  return getTransactionsDeps().transactions.listEvents(id);
}
