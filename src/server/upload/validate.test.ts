import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, sniffMime, validateUpload } from "./validate";

const bytes = (...b: number[]) => new Uint8Array(b);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0);
const WEBP = bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50);
const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34);
const text = (s: string) => new TextEncoder().encode(s);

describe("sniffMime", () => {
  it("reconhece os formatos aceitos pelos bytes iniciais", () => {
    expect(sniffMime(PNG)).toBe("image/png");
    expect(sniffMime(JPEG)).toBe("image/jpeg");
    expect(sniffMime(WEBP)).toBe("image/webp");
    expect(sniffMime(PDF)).toBe("application/pdf");
  });

  it("recusa o que não é um formato aceito, mesmo com nome enganoso", () => {
    expect(sniffMime(text("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(sniffMime(text("MZ\u0090 programa.exe"))).toBeNull();
    expect(sniffMime(text("GIF89a"))).toBeNull();
    expect(sniffMime(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45))).toBeNull(); // RIFF/WAVE
  });

  it("não quebra com arquivos muito curtos", () => {
    expect(sniffMime(bytes())).toBeNull();
    expect(sniffMime(bytes(0xff))).toBeNull();
    expect(sniffMime(bytes(0x52, 0x49, 0x46, 0x46))).toBeNull();
  });
});

describe("validateUpload", () => {
  it("aceita e devolve o tipo real e a extensão", () => {
    expect(validateUpload(PNG)).toEqual({ ok: true, mimeType: "image/png", extension: "png" });
    expect(validateUpload(JPEG)).toEqual({ ok: true, mimeType: "image/jpeg", extension: "jpg" });
    expect(validateUpload(PDF)).toEqual({ ok: true, mimeType: "application/pdf", extension: "pdf" });
  });

  it("recusa arquivo vazio", () => {
    expect(validateUpload(bytes())).toMatchObject({ ok: false, code: "empty" });
  });

  it("recusa arquivo grande demais, antes de olhar o conteúdo", () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(PNG);
    expect(validateUpload(big)).toMatchObject({ ok: false, code: "too_large" });
    expect(validateUpload(PNG, 4)).toMatchObject({ ok: false, code: "too_large" });
  });

  it("recusa formato não suportado com mensagem clara", () => {
    const r = validateUpload(text("não sou uma imagem"));
    expect(r).toMatchObject({ ok: false, code: "unsupported_type" });
    if (!r.ok) expect(r.message).toMatch(/JPEG, PNG, WebP ou PDF/);
  });
});
