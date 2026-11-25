/**
 * Validação de arquivos enviados. Nunca confia na extensão nem no tipo que o
 * navegador declara: olha os primeiros bytes (a "assinatura" do arquivo).
 */
/** 4 MB: abaixo do corte de 4,5 MB do corpo de requisição da Vercel, para o erro vir no formato do app. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type AllowedMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

const EXTENSION: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const startsWith = (b: Uint8Array, sig: ReadonlyArray<number>, offset = 0) =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);

/** Descobre o tipo real pelos bytes iniciais; null se não for um formato aceito. */
export function sniffMime(bytes: Uint8Array): AllowedMime | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // "%PDF-"
  return null;
}

export type UploadCheck =
  | { ok: true; mimeType: AllowedMime; extension: string }
  | { ok: false; code: "empty" | "too_large" | "unsupported_type"; message: string };

export function validateUpload(bytes: Uint8Array, maxBytes: number = MAX_UPLOAD_BYTES): UploadCheck {
  if (bytes.byteLength === 0) {
    return { ok: false, code: "empty", message: "O arquivo está vazio." };
  }
  if (bytes.byteLength > maxBytes) {
    return {
      ok: false,
      code: "too_large",
      message: `O arquivo passa do limite de ${Math.round(maxBytes / 1024 / 1024)} MB.`,
    };
  }
  const mimeType = sniffMime(bytes);
  if (!mimeType) {
    return { ok: false, code: "unsupported_type", message: "Formato não suportado. Envie JPEG, PNG, WebP ou PDF." };
  }
  return { ok: true, mimeType, extension: EXTENSION[mimeType] };
}
