import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sha256 } from "../hash";
import { ProviderError, type DocumentInput, type ProviderCapabilities, type VisionProvider } from "../extraction/provider";

/**
 * Gravação e repetição (estilo VCR) das respostas dos provedores de IA.
 *  - record: usa a gravação se existir; senão chama o provedor e grava a resposta.
 *  - replay: só lê as gravações (sem rede, sem chave, sem gastar cota gratuita).
 *  - live:   sempre chama o provedor, sem gravar.
 * Cada gravação guarda a versão do prompt e o hash do arquivo: se o prompt mudar,
 * a gravação deixa de valer e o eval exige regravar.
 */
export type EvalMode = "replay" | "record" | "live";

export interface Recording {
  providerId: string;
  promptVersion: string;
  docSha256: string;
  recordedAt: string;
  latencyMs: number;
  raw: unknown;
}

export { sha256 };
const safe = (id: string) => id.replace(/[^a-zA-Z0-9.-]+/g, "_");

/**
 * Apaga gravações que não valem mais: de outra versão do prompt ou de um
 * arquivo que não existe mais no conjunto. Devolve quantas foram apagadas.
 */
export async function pruneStaleRecordings(
  dir: string,
  promptVersion: string,
  validShas: ReadonlySet<string>,
): Promise<number> {
  let removed = 0;
  let providerDirs: string[];
  try {
    providerDirs = await readdir(dir);
  } catch {
    return 0;
  }
  for (const pd of providerDirs) {
    let files: string[];
    try {
      files = await readdir(join(dir, pd));
    } catch {
      continue; // não é uma pasta de provedor
    }
    for (const f of files.filter((x) => x.endsWith(".json"))) {
      const path = join(dir, pd, f);
      let stale = true;
      try {
        const rec = JSON.parse(await readFile(path, "utf8")) as Recording;
        stale = rec.promptVersion !== promptVersion || !validShas.has(rec.docSha256);
      } catch {
        /* arquivo ilegível também é descartado */
      }
      if (stale) {
        await rm(path);
        removed += 1;
      }
    }
  }
  return removed;
}

export interface ExtractionMeta {
  raw: unknown;
  latencyMs: number;
  fromRecording: boolean;
  recordedAt: string | null;
}

export class RecordedProvider implements VisionProvider {
  readonly id: string;
  readonly capabilities?: ProviderCapabilities;
  /** Quantas chamadas reais (fora da gravação) foram feitas ao provedor. */
  liveCalls = 0;

  constructor(
    private readonly inner: VisionProvider,
    private readonly opts: {
      mode: EvalMode;
      dir: string;
      promptVersion: string;
      now?: () => number;
      /** Regrava mesmo que já exista uma gravação válida. */
      refresh?: boolean;
    },
  ) {
    this.id = inner.id;
    this.capabilities = inner.capabilities;
  }

  private pathFor(sha: string): string {
    return join(this.opts.dir, safe(this.id), `${sha}.json`);
  }

  private async readValid(sha: string): Promise<Recording | null> {
    try {
      const rec = JSON.parse(await readFile(this.pathFor(sha), "utf8")) as Recording;
      return rec.promptVersion === this.opts.promptVersion && rec.docSha256 === sha ? rec : null;
    } catch {
      return null;
    }
  }

  async extractWithMeta(doc: DocumentInput, signal: AbortSignal): Promise<ExtractionMeta> {
    const sha = sha256(doc.data);
    const { mode } = this.opts;

    if (mode !== "live" && !(mode === "record" && this.opts.refresh)) {
      const rec = await this.readValid(sha);
      if (rec) return { raw: rec.raw, latencyMs: rec.latencyMs, fromRecording: true, recordedAt: rec.recordedAt };
    }
    if (mode === "replay") {
      throw new ProviderError("bad_request", "sem gravação válida para este documento (rode npm run eval:record)");
    }

    const now = this.opts.now ?? Date.now;
    const started = now();
    this.liveCalls += 1;
    const raw = await this.inner.extract(doc, signal);
    const latencyMs = now() - started;

    let recordedAt: string | null = null;
    if (mode === "record") {
      recordedAt = new Date(now()).toISOString();
      const rec: Recording = {
        providerId: this.id,
        promptVersion: this.opts.promptVersion,
        docSha256: sha,
        recordedAt,
        latencyMs,
        raw,
      };
      await mkdir(join(this.opts.dir, safe(this.id)), { recursive: true });
      await writeFile(this.pathFor(sha), JSON.stringify(rec, null, 2) + "\n");
    }
    return { raw, latencyMs, fromRecording: false, recordedAt };
  }

  async extract(doc: DocumentInput, signal: AbortSignal): Promise<unknown> {
    return (await this.extractWithMeta(doc, signal)).raw;
  }
}
