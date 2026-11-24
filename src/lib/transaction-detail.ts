import { formatFullShortDate, formatMoney } from "./format";

export interface DetailTransaction {
  kind: "receita" | "despesa";
  status: "pendente" | "confirmada" | "cancelada";
}

/** Por que o lançamento conta, ou não, no limite do MEI. Só receita confirmada conta. */
export function limitImpact(t: DetailTransaction): { counts: boolean; reason: string } {
  if (t.status === "cancelada") return { counts: false, reason: "Foi cancelado, então não conta no limite." };
  if (t.status === "pendente") return { counts: false, reason: "Ainda não foi conferido. Só conta depois da confirmação." };
  if (t.kind === "despesa") return { counts: false, reason: "É uma despesa. Só receita conta para o limite." };
  return { counts: true, reason: "É uma receita confirmada, então conta no limite do ano." };
}

export interface EventLike {
  action: "created" | "corrected" | "confirmed" | "cancelled";
  changes: Record<string, unknown>;
  createdAt: string;
}

const isChange = (v: unknown): v is { from: unknown; to: unknown } =>
  typeof v === "object" && v !== null && "from" in v && "to" in v;

const text = (v: unknown) => (typeof v === "string" && v !== "" ? v : "sem descrição");

/** Uma linha por mudança, em português: "Valor: R$ 1.250,00 → R$ 1.300,00". */
export function describeEvent(e: EventLike): { title: string; lines: string[] } {
  switch (e.action) {
    case "created":
    case "confirmed":
      return { title: "Confirmado", lines: [] };
    case "cancelled":
      return { title: "Cancelado", lines: [] };
    case "corrected": {
      const lines: string[] = [];
      const { amountCents, date, description } = e.changes;
      if (isChange(amountCents) && typeof amountCents.from === "number" && typeof amountCents.to === "number") {
        lines.push(`Valor: ${formatMoney(amountCents.from)} → ${formatMoney(amountCents.to)}`);
      }
      if (isChange(date) && typeof date.from === "string" && typeof date.to === "string") {
        lines.push(`Data: ${formatFullShortDate(date.from)} → ${formatFullShortDate(date.to)}`);
      }
      if (isChange(description)) lines.push(`Descrição: ${text(description.from)} → ${text(description.to)}`);
      return { title: "Corrigido", lines };
    }
  }
}

const SOURCE_LABEL = { nota: "Nota", pix: "Pix", manual: "Lançamento manual" } as const;
export const sourceLabel = (s: keyof typeof SOURCE_LABEL) => SOURCE_LABEL[s];

export const STATUS_LABEL = { pendente: "Para conferir", confirmada: "Confirmado", cancelada: "Cancelado" } as const;
