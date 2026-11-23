// Confere se as chaves e os modelos do MODEL_CHAIN respondem de verdade.
// Uso: npm run check:ai
// Faz UMA chamada por modelo com uma imagem em branco (consome 1 requisição da
// cota gratuita de cada um). Nunca imprime chaves.
import { parseEnv } from "../src/server/env";
import { ProviderError, type DocumentInput } from "../src/server/extraction/provider";
import { buildProviders } from "../src/server/extraction/providers";
import { parseExtraction } from "../src/server/extraction/schema";

const BLANK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const doc: DocumentInput = { mimeType: "image/png", data: Buffer.from(BLANK_PNG_BASE64, "base64") };

const parsed = parseEnv(process.env);
if (!parsed.ok) {
  console.error("Configuração inválida no .env.local:");
  for (const e of parsed.errors) console.error(`  - ${e}`);
  process.exit(1);
}

let failures = 0;
console.log(`Cadeia: ${parsed.env.modelChain.map((c) => `${c.provider}:${c.model}`).join(" → ")}\n`);

// Opcional: `npm run check:ai -- gemini` testa só os provedores cujo id contém o texto.
const only = process.argv[2];
for (const provider of buildProviders(parsed.env).filter((p) => !only || p.id.includes(only))) {
  const started = Date.now();
  try {
    const raw = await provider.extract(doc, AbortSignal.timeout(45_000));
    const ms = Date.now() - started;
    if (parseExtraction(raw).ok) {
      console.log(`  OK    ${provider.id} (${ms} ms): respondeu JSON dentro do schema`);
    } else if (typeof raw === "object" && raw !== null) {
      console.log(`  OK    ${provider.id} (${ms} ms): respondeu JSON (campos fora do schema; esperado com imagem em branco)`);
    } else {
      failures += 1;
      console.log(`  FALHA ${provider.id} (${ms} ms): resposta não é JSON (${String(raw).slice(0, 80)})`);
    }
  } catch (err) {
    failures += 1;
    const ms = Date.now() - started;
    const kind = err instanceof ProviderError ? err.kind : "erro";
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  FALHA ${provider.id} (${ms} ms) [${kind}]: ${msg.slice(0, 220)}`);
  }
}

console.log(failures === 0 ? "\nTudo certo." : `\n${failures} problema(s) encontrado(s).`);
// exitCode (em vez de process.exit) evita um erro do libuv no Windows com conexões ainda abertas.
process.exitCode = failures === 0 ? 0 : 1;
