import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attempt } from "../router";
import type { ExtractedReceipt } from "../schema";
import {
  DuplicateDocumentError,
  type DocumentKind,
  type DocumentRecord,
  type DocumentsRepo,
  type ExtractionRecord,
  type ExtractionsRepo,
  type FileStorage,
  type NewDocument,
  type NewExtraction,
  type ProfileRecord,
  type ProfilesRepo,
} from "../service";

/** Código do Postgres para violação de restrição de unicidade. */
const UNIQUE_VIOLATION = "23505";

interface DocumentRow {
  id: string;
  profile_id: string;
  storage_path: string;
  content_hash: string;
  mime_type: string;
  size_bytes: number;
  kind: DocumentKind;
}

interface ExtractionRow {
  id: string;
  document_id: string;
  status: ExtractionRecord["status"];
  provider_id: string | null;
  prompt_version: string;
  schema_version: string;
  attempts: Attempt[];
  raw_result: ExtractedReceipt | null;
}

const toDocument = (r: DocumentRow): DocumentRecord => ({
  id: r.id,
  profileId: r.profile_id,
  storagePath: r.storage_path,
  contentHash: r.content_hash,
  mimeType: r.mime_type,
  sizeBytes: r.size_bytes,
  kind: r.kind,
});

const toExtraction = (r: ExtractionRow): ExtractionRecord => ({
  id: r.id,
  documentId: r.document_id,
  status: r.status,
  providerId: r.provider_id,
  promptVersion: r.prompt_version,
  schemaVersion: r.schema_version,
  attempts: r.attempts ?? [],
  rawResult: r.raw_result,
});

export class SupabaseDocumentsRepo implements DocumentsRepo {
  constructor(private readonly db: SupabaseClient) {}

  async findByHash(profileId: string, contentHash: string): Promise<DocumentRecord | null> {
    const { data, error } = await this.db
      .from("documents")
      .select("*")
      .eq("profile_id", profileId)
      .eq("content_hash", contentHash)
      .maybeSingle();
    if (error) throw new Error(`documents: ${error.message}`);
    return data ? toDocument(data as DocumentRow) : null;
  }

  async insert(doc: NewDocument): Promise<DocumentRecord> {
    const { data, error } = await this.db
      .from("documents")
      .insert({
        profile_id: doc.profileId,
        storage_path: doc.storagePath,
        content_hash: doc.contentHash,
        mime_type: doc.mimeType,
        size_bytes: doc.sizeBytes,
        kind: doc.kind,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === UNIQUE_VIOLATION) throw new DuplicateDocumentError();
      throw new Error(`documents: ${error.message}`);
    }
    return toDocument(data as DocumentRow);
  }
}

export class SupabaseExtractionsRepo implements ExtractionsRepo {
  constructor(private readonly db: SupabaseClient) {}

  async findByDocumentId(documentId: string): Promise<ExtractionRecord | null> {
    const { data, error } = await this.db.from("extractions").select("*").eq("document_id", documentId).maybeSingle();
    if (error) throw new Error(`extractions: ${error.message}`);
    return data ? toExtraction(data as ExtractionRow) : null;
  }

  async save(e: NewExtraction): Promise<ExtractionRecord> {
    const { data, error } = await this.db
      .from("extractions")
      .upsert(
        {
          document_id: e.documentId,
          status: e.status,
          provider_id: e.providerId,
          prompt_version: e.promptVersion,
          schema_version: e.schemaVersion,
          attempts: e.attempts,
          raw_result: e.rawResult,
        },
        { onConflict: "document_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(`extractions: ${error.message}`);
    return toExtraction(data as ExtractionRow);
  }
}

export class SupabaseFileStorage implements FileStorage {
  constructor(
    private readonly db: SupabaseClient,
    private readonly bucket = "documents",
  ) {}

  async put(path: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    const { error } = await this.db.storage.from(this.bucket).upload(path, bytes, { contentType: mimeType, upsert: false });
    if (!error) return;
    // O mesmo conteúdo sempre cai no mesmo caminho (hash): já existir não é erro.
    const status = (error as { statusCode?: string | number }).statusCode;
    if (String(status) === "409" || /already exists|duplicate/i.test(error.message)) return;
    throw new Error(`storage: ${error.message}`);
  }
}

export class SupabaseProfilesRepo implements ProfilesRepo {
  constructor(private readonly db: SupabaseClient) {}

  async getDemoProfileId(): Promise<string | null> {
    const { data, error } = await this.db
      .from("mei_profiles")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`profiles: ${error.message}`);
    return data ? (data as { id: string }).id : null;
  }

  async getDemoProfile(): Promise<ProfileRecord | null> {
    const { data, error } = await this.db
      .from("mei_profiles")
      .select("id, name, tax_id, opening_date, email")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`profiles: ${error.message}`);
    if (!data) return null;
    const r = data as { id: string; name: string; tax_id: string; opening_date: string; email: string };
    return { id: r.id, name: r.name, taxId: r.tax_id.replace(/\D/g, ""), openingDate: r.opening_date, email: r.email };
  }

  async saveDemoProfile(input: Omit<ProfileRecord, "id">): Promise<ProfileRecord> {
    const row = { name: input.name, tax_id: input.taxId, opening_date: input.openingDate, email: input.email };
    const id = await this.getDemoProfileId();
    const query = id
      ? this.db.from("mei_profiles").update(row).eq("id", id)
      : this.db.from("mei_profiles").insert(row);
    const { data, error } = await query.select("id").single();
    if (error) {
      if (error.code === "23505") throw new Error("profiles: este CNPJ já está cadastrado");
      throw new Error(`profiles: ${error.message}`);
    }
    return { id: (data as { id: string }).id, ...input };
  }
}
