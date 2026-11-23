// Confere se o .env.local e o banco do Supabase estão corretos.
// Uso: npm run check:supabase
// Nunca imprime chaves; só o resultado de cada verificação.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const publishable = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLES = [
  "mei_profiles",
  "documents",
  "extractions",
  "transactions",
  "transaction_events",
  "bank_entries",
  "reconciliation_links",
  "alerts",
  "provider_cooldowns",
  "daily_quota",
];

let failures = 0;
const ok = (msg) => console.log(`  OK    ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.log(`  FALHA ${msg}`);
};

if (!url || !publishable || !secret) {
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !publishable && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !secret && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  console.error(`Variáveis ausentes no .env.local: ${missing.join(", ")}`);
  process.exit(1);
}
if (/\/(rest|auth|storage)\/v1$/.test(url)) {
  console.error("NEXT_PUBLIC_SUPABASE_URL deve terminar em .supabase.co, sem /rest/v1.");
  process.exit(1);
}

const headers = (key) => ({ apikey: key });

async function get(path, key) {
  try {
    const res = await fetch(`${url}${path}`, { headers: headers(key) });
    return { status: res.status, body: await res.json().catch(() => null) };
  } catch (err) {
    return { status: 0, body: null, error: err instanceof Error ? err.message : String(err) };
  }
}

console.log("1. Conexão e tabelas (chave secreta, usada só no servidor)");
for (const table of TABLES) {
  const r = await get(`/rest/v1/${table}?select=*&limit=1`, secret);
  if (r.status === 200 && Array.isArray(r.body)) ok(table);
  else if (r.status === 0) fail(`${table}: sem conexão (${r.error})`);
  else fail(`${table}: HTTP ${r.status} ${JSON.stringify(r.body)?.slice(0, 120)}`);
}

console.log("2. Bucket de documentos");
const buckets = await get("/storage/v1/bucket", secret);
const bucket = Array.isArray(buckets.body) ? buckets.body.find((b) => b.id === "documents") : null;
if (!bucket) fail("bucket 'documents' não encontrado");
else if (bucket.public) fail("bucket 'documents' está PÚBLICO; deveria ser privado");
else ok("bucket 'documents' existe e é privado");

console.log("3. A chave pública não pode ler dados");
const anon = await get("/rest/v1/mei_profiles?select=*&limit=1", publishable);
if (anon.status === 200 && Array.isArray(anon.body) && anon.body.length === 0) {
  ok("chave pública vê zero linhas (RLS ativa; confirmado de novo quando houver dados)");
} else if (anon.status === 401 || anon.status === 403) {
  ok(`chave pública bloqueada (HTTP ${anon.status})`);
} else {
  fail(`resposta inesperada da chave pública: HTTP ${anon.status}`);
}

console.log(failures === 0 ? "\nTudo certo." : `\n${failures} problema(s) encontrado(s).`);
process.exit(failures === 0 ? 0 : 1);
