// Confere, no banco de verdade, as peças de persistência da extração:
// cota diária atômica, cooldown dos provedores, armazenamento privado e perfil de demonstração.
// Usa linhas de teste e apaga tudo no fim. Nunca imprime chaves.
// Uso: npm run check:db
import { createAdminClient } from "../src/server/db/client";
import { PostgresCooldownStore, PostgresQuotaGuard } from "../src/server/extraction/stores/postgres";
import { SupabaseFileStorage } from "../src/server/extraction/stores/supabase-repos";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  process.exit(1);
}
const db = createAdminClient(url, key);

let failures = 0;
const ok = (m: string) => console.log(`  OK    ${m}`);
const fail = (m: string) => {
  failures += 1;
  console.log(`  FALHA ${m}`);
};
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 160);

console.log("1. Cota diária atômica (limite de teste: 2)");
const TEST_DAY = "2099-12-31";
try {
  const quota = new PostgresQuotaGuard(db, 2);
  const results = [await quota.tryConsume(TEST_DAY), await quota.tryConsume(TEST_DAY), await quota.tryConsume(TEST_DAY)];
  if (results.join() === "true,true,false") ok("duas passam e a terceira é barrada");
  else fail(`esperado true,true,false e veio ${results.join()}`);
} catch (e) {
  fail(msg(e));
} finally {
  await db.from("daily_quota").delete().eq("day", TEST_DAY);
}

console.log("2. Cooldown dos provedores");
const TEST_PROVIDER = "check-db:teste";
try {
  const store = new PostgresCooldownStore(db);
  const until = Date.now() + 60_000;
  const before = await store.blockedUntil(TEST_PROVIDER);
  await store.block(TEST_PROVIDER, until, "teste");
  const after = await store.blockedUntil(TEST_PROVIDER);
  if (before === null && after !== null && Math.abs(after - until) < 1000) ok("grava e lê o bloqueio");
  else fail(`antes=${before} depois=${after}`);
} catch (e) {
  fail(msg(e));
} finally {
  await db.from("provider_cooldowns").delete().eq("provider_id", TEST_PROVIDER);
}

console.log("3. Armazenamento privado (bucket documents)");
const TEST_PATH = `check-db/${Date.now()}.png`;
try {
  const storage = new SupabaseFileStorage(db);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  await storage.put(TEST_PATH, png, "image/png");
  await storage.put(TEST_PATH, png, "image/png"); // idempotente: gravar de novo não é erro
  const { data, error } = await db.storage.from("documents").download(TEST_PATH);
  if (error || !data) fail(`não consegui ler de volta: ${error?.message ?? "sem dados"}`);
  else ok("grava (duas vezes, sem erro) e lê de volta");
} catch (e) {
  fail(msg(e));
} finally {
  await db.storage.from("documents").remove([TEST_PATH]);
}

console.log("4. Perfil de demonstração");
const { data: profile, error: profileError } = await db.from("mei_profiles").select("id").limit(1).maybeSingle();
if (profileError) fail(profileError.message);
else if (!profile) fail("nenhum perfil. Rode: npm run seed");
else ok("existe um perfil de demonstração");

console.log(failures === 0 ? "\nTudo certo." : `\n${failures} problema(s) encontrado(s).`);
process.exitCode = failures === 0 ? 0 : 1;
