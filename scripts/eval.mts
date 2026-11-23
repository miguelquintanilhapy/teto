// Avalia a extração com IA em notas sintéticas com gabarito conhecido.
//
//   npm run eval                 repete as respostas gravadas (sem rede, sem chave)
//   npm run eval:record          chama a cadeia de verdade e grava as respostas (usa a cota gratuita)
//   npm run eval:record -- --all também roda CADA modelo em TODAS as notas (compara os modelos; gasta mais cota)
//
// Opções: --only <texto> (filtra modelos na tabela por modelo), --refresh (regrava),
//         --min-correct <0-1> e --max-silent-wrong <0-1> (porta de qualidade: sai com erro se não cumprir),
//         --no-write (não escreve docs/EVAL-RESULTS.md).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { loadSuite } from "../src/server/eval/cases";
import {
  CORE_FIELDS,
  breakdownByTag,
  compareFields,
  isCoreCorrect,
  isDirectionCorrect,
  summarizeChain,
  summarizeProvider,
  type ChainCaseResult,
  type ProviderCaseResult,
} from "../src/server/eval/metrics";
import { RecordedProvider, type EvalMode } from "../src/server/eval/recording";
import { renderReport } from "../src/server/eval/report";
import { parseEnv, parseModelChain } from "../src/server/env";
import { PROMPT_VERSION } from "../src/server/extraction/prompt";
import { ProviderError, type VisionProvider } from "../src/server/extraction/provider";
import { buildProviders } from "../src/server/extraction/providers";
import { AllProvidersFailedError, ExtractionRouter } from "../src/server/extraction/router";
import { parseExtraction } from "../src/server/extraction/schema";
import { checkBusinessRules } from "../src/server/extraction/validate";

const ROOT = join(import.meta.dirname, "..");
const FIXTURES = join(ROOT, "fixtures", "eval");
const RECORDINGS = join(FIXTURES, "recordings");
const REPORT = join(ROOT, "docs", "EVAL-RESULTS.md");
/** Data fixa: o resultado não pode mudar conforme o dia em que o eval roda. */
const EVAL_TODAY = "2026-11-30";

const { values: args } = parseArgs({
  options: {
    mode: { type: "string", default: "replay" },
    only: { type: "string" },
    all: { type: "boolean", default: false },
    refresh: { type: "boolean", default: false },
    "min-correct": { type: "string" },
    "max-silent-wrong": { type: "string" },
    "no-write": { type: "boolean", default: false },
  },
});
const mode = args.mode as EvalMode;
if (!["replay", "record", "live"].includes(mode)) throw new Error(`--mode inválido: ${mode}`);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Intervalo mínimo entre chamadas reais, respeitando os limites por minuto do plano gratuito. */
const paceMs = (id: string) => (id.includes("3.8") ? 13_000 : id.startsWith("openrouter") ? 4_000 : 5_000);

// ------------------------------------------------------------- cadeia e provedores
const chainFile = join(FIXTURES, "chain.json");
let chainSpec: string;
let env: ReturnType<typeof parseEnv> | undefined;
if (mode === "replay") {
  chainSpec = process.env.MODEL_CHAIN || (JSON.parse(readFileSync(chainFile, "utf8")) as { modelChain: string }).modelChain;
} else {
  env = parseEnv(process.env);
  if (!env.ok) {
    console.error("Configuração inválida no .env.local:\n" + env.errors.map((e) => `  - ${e}`).join("\n"));
    process.exit(1);
  }
  chainSpec = env.env.modelChain.map((c) => `${c.provider}:${c.model}`).join(",");
  mkdirSync(FIXTURES, { recursive: true });
  writeFileSync(chainFile, JSON.stringify({ modelChain: chainSpec }, null, 2) + "\n");
}
const modelChain = parseModelChain(chainSpec);
const providers: VisionProvider[] = buildProviders({
  modelChain,
  geminiApiKey: env?.ok ? env.env.geminiApiKey : "replay",
  openrouterApiKey: env?.ok ? env.env.openrouterApiKey : "replay",
});

const wrap = (p: VisionProvider, m: EvalMode) =>
  new RecordedProvider(p, { mode: m, dir: RECORDINGS, promptVersion: PROMPT_VERSION, refresh: args.refresh });

const suite = await loadSuite(FIXTURES);
console.log(`Avaliação: ${suite.cases.length} notas · prompt ${PROMPT_VERSION} · modo ${mode}`);
console.log(`Cadeia: ${chainSpec.split(",").join(" → ")}\n`);

// ------------------------------------- (1) opcional: cada modelo em todas as notas
async function liveWithRetry(rp: RecordedProvider, doc: (typeof suite.cases)[number]["doc"]) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await rp.extractWithMeta(doc, AbortSignal.timeout(90_000));
    } catch (e) {
      if (attempt >= 3 || !(e instanceof ProviderError) || e.kind === "bad_request") throw e;
      await sleep(Math.min(e.retryAfterMs ?? 15_000, 60_000));
    }
  }
}

if (mode === "record" && args.all) {
  for (const p of providers) {
    const rp = wrap(p, "record");
    for (const c of suite.cases) {
      const before = rp.liveCalls;
      try {
        await liveWithRetry(rp, c.doc);
        console.log(`  gravado  ${p.id}  ${c.id}`);
      } catch (e) {
        console.log(`  falhou   ${p.id}  ${c.id}: ${e instanceof Error ? e.message.slice(0, 90) : e}`);
      }
      if (rp.liveCalls > before) await sleep(paceMs(p.id));
    }
  }
}

// ---------------------------------------------------------- (2) a cadeia completa
const chainResults: ChainCaseResult[] = [];
for (const c of suite.cases) {
  const wrapped = providers.map((p) => wrap(p, mode === "record" ? "record" : "replay"));
  const router = new ExtractionRouter({
    providers: wrapped,
    today: () => EVAL_TODAY,
    cooldownMs: 3_000,
    ...(mode === "record" ? { timeoutMs: 90_000, totalBudgetMs: 300_000 } : {}),
  });
  let row: ChainCaseResult;
  try {
    const r = await router.extract(c.doc);
    const fields = compareFields(c.expected, r.data);
    row = {
      caseId: c.id,
      tags: c.tags,
      status: r.status,
      providerId: r.providerId,
      attempts: r.attempts.filter((a) => !a.outcome.startsWith("skipped")).length,
      coreCorrect: isCoreCorrect(fields),
      wrongFields: CORE_FIELDS.filter((f) => !fields[f]),
      directionOk: isDirectionCorrect(suite.ownerTaxId, c.expected, r.data),
    };
  } catch (e) {
    row = {
      caseId: c.id,
      tags: c.tags,
      status: "failed",
      providerId: null,
      attempts: e instanceof AllProvidersFailedError ? e.attempts.length : 0,
      coreCorrect: null,
      wrongFields: [],
      directionOk: null,
    };
  }
  chainResults.push(row);
  console.log(`  cadeia   ${c.id.padEnd(10)} ${row.status}${row.coreCorrect === false ? " (ERRADA)" : ""}`);
  if (mode === "record" && wrapped.some((w) => w.liveCalls > 0)) await sleep(Math.max(...wrapped.filter((w) => w.liveCalls > 0).map((w) => paceMs(w.id))));
}

// ---------------------------------------- (3) por modelo, lendo as gravações
let lastRecordedAt: string | null = null;
const providerRows = [];
for (const p of providers.filter((x) => !args.only || x.id.includes(args.only))) {
  const rp = wrap(p, "replay");
  const results: ProviderCaseResult[] = [];
  for (const c of suite.cases) {
    const base = { caseId: c.id, tags: c.tags };
    try {
      const m = await rp.extractWithMeta(c.doc, AbortSignal.timeout(10_000));
      if (m.recordedAt && (!lastRecordedAt || m.recordedAt > lastRecordedAt)) lastRecordedAt = m.recordedAt;
      const parsed = parseExtraction(m.raw);
      if (!parsed.ok) {
        results.push({ ...base, outcome: "schema_invalid", latencyMs: m.latencyMs, rulesIssues: parsed.issues, fields: null, directionOk: null });
        continue;
      }
      results.push({
        ...base,
        outcome: "ok",
        latencyMs: m.latencyMs,
        rulesIssues: checkBusinessRules(parsed.data, { minConfidence: 0.7, today: EVAL_TODAY }),
        fields: compareFields(c.expected, parsed.data),
        directionOk: isDirectionCorrect(suite.ownerTaxId, c.expected, parsed.data),
      });
    } catch (e) {
      const missing = e instanceof ProviderError && e.message.startsWith("sem gravação");
      results.push({ ...base, outcome: missing ? "no_recording" : "error", latencyMs: null, rulesIssues: [], fields: null, directionOk: null });
    }
  }
  providerRows.push({ id: p.id, summary: summarizeProvider(results), results });
}

// ---------------------------------------------------------------------- relatório
const chainSummary = summarizeChain(chainResults);
const report = renderReport({
  promptVersion: PROMPT_VERSION,
  mode,
  caseCount: suite.cases.length,
  chain: chainSpec.split(","),
  lastRecordedAt,
  providers: providerRows,
  chainSummary,
  chainResults,
  byTag: breakdownByTag(chainResults),
});
if (!args["no-write"]) {
  writeFileSync(REPORT, report);
  console.log(`\nRelatório: docs/EVAL-RESULTS.md`);
}

const pct = (x: number | null) => (x === null ? "n/d" : `${Math.round(x * 100)}%`);
console.log(
  `\nCadeia: corretas ${pct(chainSummary.acceptedCorrectRate)} · erro silencioso ${pct(chainSummary.silentWrongRate)} · ` +
    `revisão ${pct(chainSummary.needsReviewRate)} · falha ${pct(chainSummary.failedRate)}`,
);
for (const p of providerRows) {
  console.log(`  ${p.id}: ${p.summary.evaluated}/${p.summary.total} gravadas · núcleo correto ${pct(p.summary.coreCorrectRate)}`);
}

// ----------------------------------------------------------- porta de qualidade
const minCorrect = args["min-correct"] === undefined ? undefined : Number(args["min-correct"]);
const maxSilent = args["max-silent-wrong"] === undefined ? undefined : Number(args["max-silent-wrong"]);
let gateFailed = false;
if (minCorrect !== undefined && (chainSummary.acceptedCorrectRate ?? 0) < minCorrect) {
  console.error(`\nREPROVADO: corretas ${pct(chainSummary.acceptedCorrectRate)} < mínimo ${pct(minCorrect)}`);
  gateFailed = true;
}
if (maxSilent !== undefined && (chainSummary.silentWrongRate ?? 0) > maxSilent) {
  console.error(`\nREPROVADO: erro silencioso ${pct(chainSummary.silentWrongRate)} > máximo ${pct(maxSilent)}`);
  gateFailed = true;
}
process.exitCode = gateFailed ? 1 : 0;
