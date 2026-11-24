// Cria lançamentos de demonstração FICTÍCIOS para o perfil de demo (painel e vídeo).
// Uso:
//   npm run seed:demo                     60.000 de receita no ano (faixa "Atenção")
//   npm run seed:demo -- --total 40000    outro total (ex.: 40000 ok, 64000 crítico, 72000 acima do limite)
//   npm run seed:demo -- --reset          remove só os lançamentos de demonstração
//
// Só mexe nas linhas que ele mesmo cria: origem "manual" e contraparte entre as fictícias
// abaixo. Nunca apaga o que o usuário lançou de verdade.
import { createAdminClient } from "../src/server/db/client";
import { isValidCnpj, isValidCpf } from "../src/core/documents";

// ---- contrapartes fictícias, com dígitos verificadores válidos
function dv(digits: string, weights: number[]): number {
  const sum = [...digits].reduce((acc, d, i) => acc + Number(d) * weights[i]!, 0);
  const r = sum % 11;
  return r < 2 ? 0 : 11 - r;
}
const cnpj = (base12: string) => {
  const d1 = dv(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const v = `${base12}${d1}${dv(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])}`;
  if (!isValidCnpj(v)) throw new Error("CNPJ gerado inválido");
  return v;
};
const cpf = (base9: string) => {
  const calc = (d: string) => {
    const r = ([...d].reduce((a, c, i) => a + Number(c) * (d.length + 1 - i), 0) * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(base9);
  const v = `${base9}${d1}${calc(base9 + d1)}`;
  if (!isValidCpf(v)) throw new Error("CPF gerado inválido");
  return v;
};

const PARTIES = [
  cpf("123456789"),
  cpf("234567891"),
  cpf("345678912"),
  cpf("456789123"),
  cnpj("123456780001"),
  cnpj("234567890001"),
  cnpj("567890120001"),
];
const SUPPLIER = cnpj("345678900001");
const DEMO_PARTIES = [...PARTIES, SUPPLIER];

const DESCRIPTIONS = [
  "Bolo de aniversário",
  "Doces para festa",
  "Caixa de brigadeiros",
  "Torta de limão",
  "Kit festa",
  "Encomenda de docinhos",
  "Cesta de café da manhã",
  "Bolo decorado",
  "Sobremesas do mês",
  "Bolo de casamento",
];

// Distribuição de março a novembro que soma 60.000 (escalada proporcionalmente por --total)
const MONTHS: Array<[number, number]> = [
  [3, 4_200],
  [4, 5_150],
  [5, 6_300],
  [6, 5_800],
  [7, 6_950],
  [8, 7_400],
  [9, 8_200],
  [10, 9_300],
  [11, 6_700],
];
const BASE_TOTAL = MONTHS.reduce((s, [, v]) => s + v, 0);

// ---- argumentos
const args = process.argv.slice(2);
const reset = args.includes("--reset");
const totalIdx = args.indexOf("--total");
const totalReais = totalIdx >= 0 ? Number(args[totalIdx + 1]) : 60_000;
if (!reset && (!Number.isFinite(totalReais) || totalReais <= 0 || totalReais > 10_000_000)) {
  console.error("Use --total com um valor em reais entre 1 e 10.000.000.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  process.exit(1);
}
const db = createAdminClient(url, key);

const { data: profile, error: pe } = await db.from("mei_profiles").select("id").order("created_at").limit(1).maybeSingle();
if (pe || !profile) {
  console.error("Perfil de demonstração não encontrado. Rode antes: npm run seed");
  process.exit(1);
}
const profileId = (profile as { id: string }).id;

// 1) remove só o que este script criou antes
const { error: delError, count: removed } = await db
  .from("transactions")
  .delete({ count: "exact" })
  .eq("profile_id", profileId)
  .eq("source", "manual")
  .in("counterparty_tax_id", DEMO_PARTIES);
if (delError) {
  console.error(`Não consegui limpar os lançamentos de demonstração: ${delError.message}`);
  process.exit(1);
}
console.log(`lançamentos de demonstração removidos: ${removed ?? 0}`);
if (reset) process.exit(0);

// 2) cria os novos
const factor = totalReais / BASE_TOTAL;
const rows: Array<Record<string, unknown>> = [];
let n = 0;
for (const [month, base] of MONTHS) {
  const monthCents = Math.round(base * factor * 100);
  const first = Math.round(monthCents * 0.55);
  const parts: Array<[number, number]> = [
    [month === 11 ? 5 : 8, first],
    [month === 11 ? 19 : 22, monthCents - first],
  ];
  for (const [day, cents] of parts) {
    rows.push({
      profile_id: profileId,
      date: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      amount_cents: cents,
      kind: "receita",
      source: "manual",
      status: "confirmada",
      counterparty_tax_id: PARTIES[n % PARTIES.length],
      description: DESCRIPTIONS[n % DESCRIPTIONS.length],
    });
    n += 1;
  }
}
// uma despesa (não entra no limite), para mostrar a diferença na lista
rows.push({
  profile_id: profileId,
  date: "2026-10-15",
  amount_cents: 512_37,
  kind: "despesa",
  source: "manual",
  status: "confirmada",
  counterparty_tax_id: SUPPLIER,
  description: "Compra de farinha e açúcar",
});

const { data: inserted, error: insError } = await db.from("transactions").insert(rows).select("id");
if (insError) {
  console.error(`Não consegui criar os lançamentos: ${insError.message}`);
  process.exit(1);
}
const { error: evError } = await db
  .from("transaction_events")
  .insert((inserted ?? []).map((r) => ({ transaction_id: (r as { id: string }).id, action: "created", changes: { demo: true } })));
if (evError) console.error(`Aviso: não consegui gravar o histórico: ${evError.message}`);

const sum = rows.filter((r) => r.kind === "receita").reduce((s, r) => s + (r.amount_cents as number), 0);
console.log(`lançamentos criados: ${rows.length} (receita total: R$ ${(sum / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`);
