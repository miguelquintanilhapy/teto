import { describe, expect, it } from "vitest";
import { jpegName, needsShrink, planResize, SHRINK_ABOVE_BYTES, shrinkImage, STEPS, TARGET_BYTES } from "./image-resize";

describe("planResize", () => {
  it("reduz pelo lado maior e mantém a proporção", () => {
    expect(planResize(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(planResize(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it("nunca amplia", () => {
    expect(planResize(800, 600, 2000)).toEqual({ width: 800, height: 600 });
    expect(planResize(2000, 1000, 2000)).toEqual({ width: 2000, height: 1000 });
  });

  it("não deixa nenhum lado chegar a zero", () => {
    expect(planResize(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe("needsShrink", () => {
  it("só reduz imagem grande", () => {
    expect(needsShrink({ type: "image/jpeg", size: SHRINK_ABOVE_BYTES + 1 })).toBe(true);
    expect(needsShrink({ type: "image/jpeg", size: SHRINK_ABOVE_BYTES })).toBe(false);
    expect(needsShrink({ type: "image/png", size: 500_000 })).toBe(false);
  });

  it("PDF passa direto, por maior que seja", () => {
    expect(needsShrink({ type: "application/pdf", size: 9_000_000 })).toBe(false);
  });
});

describe("jpegName", () => {
  it("troca a extensão e cuida de nomes sem ela", () => {
    expect(jpegName("IMG_0042.HEIC")).toBe("IMG_0042.jpg");
    expect(jpegName("nota.fiscal.png")).toBe("nota.fiscal.jpg");
    expect(jpegName("sem-extensao")).toBe("sem-extensao.jpg");
    expect(jpegName(".png")).toBe("nota.jpg");
  });
});

describe("STEPS", () => {
  it("vai da mais fiel à mais econômica e nunca passa de 4 MB de alvo", () => {
    expect(TARGET_BYTES).toBeLessThan(4 * 1024 * 1024);
    for (let i = 1; i < STEPS.length; i++) {
      const prev = STEPS[i - 1]!;
      const cur = STEPS[i]!;
      expect(cur.maxSide <= prev.maxSide).toBe(true);
      expect(cur.maxSide < prev.maxSide || cur.quality < prev.quality).toBe(true);
    }
  });

  it("mantém o texto legível: o lado maior não cai abaixo de 1280 px", () => {
    expect(Math.min(...STEPS.map((s) => s.maxSide))).toBeGreaterThanOrEqual(1280);
  });
});

describe("shrinkImage", () => {
  it("devolve o mesmo arquivo quando não precisa reduzir", async () => {
    const pdf = new File([new Uint8Array(10)], "nota.pdf", { type: "application/pdf" });
    expect(await shrinkImage(pdf)).toBe(pdf);
    const small = new File([new Uint8Array(1000)], "nota.png", { type: "image/png" });
    expect(await shrinkImage(small)).toBe(small);
  });

  it("não lança quando o navegador não consegue decodificar: o original segue", async () => {
    const big = new File([new Uint8Array(SHRINK_ABOVE_BYTES + 10)], "foto.heic", { type: "image/heic" });
    // No ambiente de testes não existe createImageBitmap/canvas: o arquivo deve voltar intacto.
    expect(await shrinkImage(big)).toBe(big);
  });
});
