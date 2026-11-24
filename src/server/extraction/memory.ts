import {
  DuplicateDocumentError,
  type DocumentRecord,
  type DocumentsRepo,
  type ExtractionRecord,
  type ExtractionsRepo,
  type FileStorage,
  type NewDocument,
  type NewExtraction,
  type ProfilesRepo,
} from "./service";

/** Implementações em memória das portas de persistência: testes e desenvolvimento sem banco. */
export class InMemoryDocumentsRepo implements DocumentsRepo {
  readonly rows: DocumentRecord[] = [];

  async findByHash(profileId: string, contentHash: string): Promise<DocumentRecord | null> {
    return this.rows.find((d) => d.profileId === profileId && d.contentHash === contentHash) ?? null;
  }

  async insert(doc: NewDocument): Promise<DocumentRecord> {
    if (this.rows.some((d) => d.profileId === doc.profileId && d.contentHash === doc.contentHash)) {
      throw new DuplicateDocumentError();
    }
    const row: DocumentRecord = { id: crypto.randomUUID(), ...doc };
    this.rows.push(row);
    return row;
  }
}

export class InMemoryExtractionsRepo implements ExtractionsRepo {
  readonly rows = new Map<string, ExtractionRecord>();

  async findByDocumentId(documentId: string): Promise<ExtractionRecord | null> {
    return this.rows.get(documentId) ?? null;
  }

  async save(extraction: NewExtraction): Promise<ExtractionRecord> {
    const existing = this.rows.get(extraction.documentId);
    const row: ExtractionRecord = { id: existing?.id ?? crypto.randomUUID(), ...extraction };
    this.rows.set(extraction.documentId, row);
    return row;
  }
}

export class InMemoryFileStorage implements FileStorage {
  readonly files = new Map<string, { bytes: Uint8Array; mimeType: string }>();

  async put(path: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    this.files.set(path, { bytes, mimeType });
  }
}

export class InMemoryProfilesRepo implements ProfilesRepo {
  constructor(private readonly id: string | null) {}

  async getDemoProfileId(): Promise<string | null> {
    return this.id;
  }
}
