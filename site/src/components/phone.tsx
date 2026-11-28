import Image, { type StaticImageData } from "next/image";

/**
 * As capturas são feitas com as áreas seguras de um iPhone de 390 x 844 pontos (scripts/capturar-telas.mjs):
 * o app já deixa 47 pt livres no alto, onde fica a câmera, e 34 pt embaixo, onde fica o traço de início.
 * As medidas são em `cqw` (largura da tela), para crescer e encolher junto com a captura.
 *
 * As imagens são WebP sem perda, em 3x: o site as serve como estão (`unoptimized`), sem recomprimir,
 * para o texto miúdo das telas ficar nítido.
 */
/**
 * Moldura de celular desenhada em CSS para as capturas reais do app.
 * Genérica de propósito (sem marca de aparelho): o produto é a tela, não o telefone.
 */
export function Phone({
  src,
  alt,
  preload = false,
  className = "",
  tone = "dark",
  screen = "dark",
}: {
  src: StaticImageData;
  alt: string;
  preload?: boolean;
  className?: string;
  /** Cor do aro: escuro sobre palco claro também funciona; claro é para variar entre mockups. */
  tone?: "dark" | "light";
  /** Tema da captura: decide a cor do traço de início. */
  screen?: "dark" | "light";
}) {
  const frame =
    tone === "dark"
      ? "bg-[linear-gradient(145deg,#3a3a3e,#151517_40%,#2a2a2d)] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.14),0_0_0_1px_rgb(0_0_0/0.6)]"
      : "bg-[linear-gradient(145deg,#f4f4f6,#c9c9ce_45%,#ececef)] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.7),0_0_0_1px_rgb(0_0_0/0.12)]";
  const button = tone === "dark" ? "bg-[#2a2a2d]" : "bg-[#c9c9ce]";
  return (
    <figure className={`relative ${className}`}>
      {/* botões laterais */}
      <span aria-hidden="true" className={`absolute -left-[2px] top-[18%] h-[6%] w-[3px] rounded-l-sm ${button}`} />
      <span aria-hidden="true" className={`absolute -left-[2px] top-[26%] h-[6%] w-[3px] rounded-l-sm ${button}`} />
      <span aria-hidden="true" className={`absolute -right-[2px] top-[22%] h-[10%] w-[3px] rounded-r-sm ${button}`} />
      {/* aro: um pouco mais grosso que a borda da tela, como num aparelho de verdade */}
      <div className={`rounded-[16%/7.4%] p-[4.2%] ${frame}`}>
        {/* a tela: 390 x 844, a proporção da captura */}
        <div className={`@container relative overflow-hidden rounded-[12.5%/5.8%] bg-black`}>
          <Image
            src={src}
            alt={alt}
            unoptimized
            preload={preload}
            placeholder="blur"
            className="block h-auto w-full"
          />
          {/* câmera frontal: uma pílula discreta na folga do alto da tela */}
          <span
            aria-hidden="true"
            style={{ top: `${(11 / 390) * 100}cqw` }}
            className="absolute left-1/2 h-[8.6cqw] w-[29cqw] -translate-x-1/2 rounded-full bg-black"
          />
          {/* traço de início */}
          <span
            aria-hidden="true"
            className={`absolute bottom-[2.1cqw] left-1/2 h-[1.3cqw] w-[34cqw] -translate-x-1/2 rounded-full ${screen === "dark" ? "bg-white/90" : "bg-black/85"}`}
          />
          {/* reflexo leve do vidro */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/0.07),transparent_38%)]" />
        </div>
      </div>
    </figure>
  );
}
