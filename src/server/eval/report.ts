import { FIELDS, type ChainCaseResult, type ChainSummary, type ProviderCaseResult, type ProviderSummary } from "./metrics";

export interface ReportInput {
  promptVersion: string;
  mode: string;
  caseCount: number;
  chain: string[];
  /** Data da gravação mais recente usada (mantém o relatório estável entre execuções). */
  lastRecordedAt: string | null;
  providers: Array<{ id: string; summary: ProviderSummary; results: ProviderCaseResult[] }>;
  chainSummary: ChainSummary;
  chainResults: ChainCaseResult[];
  byTag: Record<string, { total: number; correct: number }>;
}

const pct = (x: number | null) => (x === null ? "n/d" : `${Math.round(x * 100)}%`);
const secs = (ms: number | null) => (ms === null ? "n/d" : `${(ms / 1000).toFixed(1).replace(".", ",")} s`);

const FIELD_LABEL: Record<(typeof FIELDS)[number], string> = {
  documentType: "tipo",
  issueDate: "data",
  totalCents: "valor",
  issuerTaxId: "emissor",
  recipientTaxId: "destinatário",
  accessKey: "chave",
};

export function renderReport(r: ReportInput): string {
  const out: string[] = [];
  out.push("# Resultados da avaliação da extração");
  out.push("");
  out.push(
    "> Gerado por `npm run eval`. **Não edite à mão.** Notas 100% sintéticas e gabarito conhecido; " +
      "as respostas dos modelos ficam gravadas em `fixtures/eval/recordings` para o resultado ser reprodutível.",
  );
  out.push("");
  out.push(`- Casos: **${r.caseCount}** · prompt: **${r.promptVersion}** · modo: ${r.mode}`);
  out.push(`- Cadeia: ${r.chain.map((c) => `\`${c}\``).join(" → ")}`);
  if (r.lastRecordedAt) out.push(`- Gravação mais recente: ${r.lastRecordedAt.slice(0, 10)}`);
  out.push("");

  const c = r.chainSummary;
  out.push("## Cadeia completa (o que o usuário vive)");
  out.push("");
  out.push("| Resultado | Casos | Taxa |");
  out.push("|---|---|---|");
  out.push(`| Aceita automaticamente e **correta** | ${c.acceptedCorrect} | ${pct(c.acceptedCorrectRate)} |`);
  out.push(`| Aceita automaticamente e **errada** (erro silencioso) | ${c.silentWrong} | ${pct(c.silentWrongRate)} |`);
  out.push(`| Enviada para revisão manual | ${c.needsReview} | ${pct(c.needsReviewRate)} |`);
  out.push(`| Falha total (nenhum modelo respondeu) | ${c.failed} | ${pct(c.failedRate)} |`);
  out.push("");
  out.push(
    `Tentativas por nota (média): ${c.avgAttempts === null ? "n/d" : c.avgAttempts.toFixed(2).replace(".", ",")}. ` +
      `Quem respondeu: ${Object.entries(c.providerShare).map(([k, v]) => `\`${k}\` ${v}`).join(", ") || "ninguém"}.`,
  );
  out.push("");
  out.push(
    "O número que mais importa é o **erro silencioso**: uma extração errada aceita sem revisão. " +
      "Por isso toda extração só entra no limite depois que o usuário confirma.",
  );
  out.push("");

  out.push("## Por modelo (cada um sozinho)");
  out.push("");
  out.push("| Modelo | Gravações | JSON válido | Núcleo correto | Direção | Passa nas regras | p50 | p95 |");
  out.push("|---|---|---|---|---|---|---|---|");
  for (const p of r.providers) {
    const s = p.summary;
    out.push(
      `| \`${p.id}\` | ${s.evaluated}/${s.total} | ${pct(s.schemaValidRate)} | ${pct(s.coreCorrectRate)} | ` +
        `${pct(s.directionRate)} | ${pct(s.rulesPassRate)} | ${secs(s.p50LatencyMs)} | ${secs(s.p95LatencyMs)} |`,
    );
  }
  out.push("");
  out.push("_Núcleo = data, valor, emissor e destinatário todos certos. Direção = receita/despesa derivada pelo código._");
  out.push("");

  out.push("### Acerto por campo");
  out.push("");
  out.push(`| Modelo | ${FIELDS.map((f) => FIELD_LABEL[f]).join(" | ")} |`);
  out.push(`|---|${FIELDS.map(() => "---").join("|")}|`);
  for (const p of r.providers) {
    const fa = p.summary.fieldAccuracy;
    out.push(`| \`${p.id}\` | ${FIELDS.map((f) => pct(fa ? fa[f] : null)).join(" | ")} |`);
  }
  out.push("");

  out.push("## Por tipo de caso (cadeia)");
  out.push("");
  out.push("| Etiqueta | Corretos / total |");
  out.push("|---|---|");
  for (const [tag, v] of Object.entries(r.byTag).sort(([a], [b]) => a.localeCompare(b))) {
    out.push(`| ${tag} | ${v.correct}/${v.total} |`);
  }
  out.push("");

  const wrong = r.chainResults.filter((x) => x.status === "accepted" && x.coreCorrect === false);
  out.push("## Erros silenciosos");
  out.push("");
  if (wrong.length === 0) {
    out.push("Nenhum nesta execução.");
  } else {
    for (const w of wrong) {
      out.push(`- \`${w.caseId}\` (${w.providerId}): divergiu em ${w.wrongFields.join(", ")}`);
    }
  }
  out.push("");

  out.push("## Resultado por nota");
  out.push("");
  out.push(`| Nota | Cadeia | ${r.providers.map((p) => `\`${p.id}\``).join(" | ")} |`);
  out.push(`|---|---|${r.providers.map(() => "---").join("|")}|`);
  for (const cr of r.chainResults) {
    const chainCell =
      cr.status === "accepted" ? (cr.coreCorrect ? "✓" : "✗ silencioso") : cr.status === "needs_review" ? "revisão" : "falha";
    const cells = r.providers.map((p) => {
      const res = p.results.find((x) => x.caseId === cr.caseId);
      if (!res || res.outcome === "no_recording") return "·";
      if (res.outcome !== "ok") return "erro";
      return res.fields && FIELDS.every(() => true) && coreOk(res) ? "✓" : "✗";
    });
    out.push(`| ${cr.caseId} | ${chainCell} | ${cells.join(" | ")} |`);
  }
  out.push("");
  out.push("Legenda: ✓ núcleo correto · ✗ errado · revisão = precisaria de conferência manual · · sem gravação.");
  out.push("");
  return out.join("\n");
}

function coreOk(res: ProviderCaseResult): boolean {
  const f = res.fields;
  return f !== null && f.issueDate && f.totalCents && f.issuerTaxId && f.recipientTaxId;
}
