/**
 * Lançamentos que parecem o mesmo registrado duas vezes: mesma data, mesmo valor, mesmo tipo, mesma outra parte
 * e mesma descrição. É só um aviso (duas vendas iguais no mesmo dia podem existir); quem decide é o usuário.
 * Cancelados não contam: já estão fora do limite.
 */
export interface DuplicateCandidate {
  id: string;
  date: string;
  amountCents: number;
  kind: string;
  status: string;
  counterparty: string;
  description: string;
}

const normalize = (s: string) => s.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");

export function suspectedDuplicates(list: ReadonlyArray<DuplicateCandidate>): Set<string> {
  const groups = new Map<string, string[]>();
  for (const t of list) {
    if (t.status === "cancelada") continue;
    const key = [t.date, t.amountCents, t.kind, t.counterparty, normalize(t.description)].join("|");
    groups.set(key, [...(groups.get(key) ?? []), t.id]);
  }
  const out = new Set<string>();
  for (const ids of groups.values()) if (ids.length > 1) for (const id of ids) out.add(id);
  return out;
}
