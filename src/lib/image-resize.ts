/**
 * Reduz a foto da nota no próprio aparelho, antes de enviar. Quem fotografa não precisa saber de megabytes:
 * celulares geram fotos de 3 a 12 MB, o servidor aceita 4 MB, e uma foto menor sobe e é lida mais rápido.
 *
 * As contas (quanto reduzir, como renomear) são puras e testadas; só `shrinkImage` toca no navegador.
 */

/** Alvo com folga sob o limite de 4 MB do servidor. */
export const TARGET_BYTES = 3 * 1024 * 1024;
/** Fotos até este tamanho sobem como estão: reencodar só pioraria a nitidez. */
export const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024;

/**
 * Tentativas, da mais fiel à mais econômica. O lado maior nunca fica abaixo de 1280 px:
 * é o que ainda deixa o texto miúdo de uma nota legível para a IA.
 */
export const STEPS: ReadonlyArray<{ maxSide: number; quality: number }> = [
  { maxSide: 2000, quality: 0.85 },
  { maxSide: 2000, quality: 0.72 },
  { maxSide: 1600, quality: 0.72 },
  { maxSide: 1280, quality: 0.65 },
];

/** Tamanho final, mantendo a proporção e sem nunca ampliar. */
export function planResize(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide || longest <= 0) return { width, height };
  const k = maxSide / longest;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

/** Só imagem grande precisa de redução. PDF e imagem pequena passam direto. */
export function needsShrink(file: { type: string; size: number }): boolean {
  return file.type.startsWith("image/") && file.size > SHRINK_ABOVE_BYTES;
}

/** "IMG_0042.HEIC" vira "IMG_0042.jpg". */
export function jpegName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "");
  return `${base || "nota"}.jpg`;
}

/**
 * Devolve uma versão menor da foto (JPEG) ou o próprio arquivo, se não for imagem, já for pequeno ou o
 * navegador não conseguir decodificar. Nunca lança: na dúvida, o arquivo original segue e o servidor decide.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!needsShrink(file)) return file;
  try {
    const bitmap = await createImageBitmap(file); // já respeita a rotação da foto (EXIF)
    try {
      let best: Blob | null = null;
      for (const step of STEPS) {
        const { width, height } = planResize(bitmap.width, bitmap.height, step.maxSide);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;
        ctx.fillStyle = "#ffffff"; // PNG com fundo transparente vira branco, e não preto
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", step.quality));
        if (!blob) return file;
        best = blob;
        if (blob.size <= TARGET_BYTES) break;
      }
      if (!best || best.size >= file.size) return file;
      return new File([best], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
