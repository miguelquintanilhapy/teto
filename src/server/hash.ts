import { createHash } from "node:crypto";

/** SHA-256 em hexadecimal: identifica o conteúdo de um arquivo (idempotência e gravações do eval). */
export const sha256 = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex");
