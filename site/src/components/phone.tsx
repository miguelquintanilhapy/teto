import Image, { type StaticImageData } from "next/image";

/**
 * As capturas são feitas com as áreas seguras de um iPhone de 390 x 844 pontos (scripts/capturar-telas.mjs):
 * o app já deixa 47 pt livres no alto e 34 pt embaixo. Aqui a moldura ocupa essas folgas com a barra de status
 * e o traço de início, como num celular de verdade. As medidas são em `cqw` (largura da tela), para a barra
 * crescer e encolher junto com a captura.
 */
const STATUS = `${(47 / 390) * 100}cqw`;

/** Hora, sinal, Wi-Fi e bateria, desenhados em SVG (sem marca de aparelho). */
function StatusBar() {
  return (
    <div
      aria-hidden="true"
      style={{ height: STATUS }}
      className="absolute inset-x-0 top-0 flex items-center justify-between px-[8.5cqw] pt-[1.6cqw] text-[4.1cqw] font-semibold tracking-[-0.01em]"
    >
      <span className="tabular">9:41</span>
      <span className="flex items-center gap-[1.5cqw]">
        {/* sinal */}
        <svg viewBox="0 0 18 12" className="h-[3cqw] w-auto" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" />
          <rect x="15" y="0" width="3" height="12" rx="0.8" />
        </svg>
        {/* Wi-Fi */}
        <svg viewBox="0 0 16 12" className="h-[3cqw] w-auto" fill="currentColor">
          <path d="M8 2.4c2.3 0 4.4.9 6 2.4l1.3-1.4A10.6 10.6 0 0 0 8 .4 10.6 10.6 0 0 0 .7 3.4L2 4.8a8.6 8.6 0 0 1 6-2.4Z" />
          <path d="M8 6c1.3 0 2.5.5 3.4 1.3l1.3-1.4A7 7 0 0 0 8 4a7 7 0 0 0-4.7 1.9l1.3 1.4C5.5 6.5 6.7 6 8 6Z" />
          <path d="M8 9.4c.5 0 .9.2 1.2.5L8 11.6 6.8 9.9c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        {/* bateria */}
        <svg viewBox="0 0 27 13" className="h-[3.2cqw] w-auto">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" strokeOpacity="0.4" />
          <rect x="2" y="2" width="16" height="9" rx="2" fill="currentColor" />
          <path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z" fill="currentColor" fillOpacity="0.4" />
        </svg>
      </span>
    </div>
  );
}

/**
 * Moldura de celular desenhada em CSS para as capturas reais do app.
 * Genérica de propósito (sem marca de aparelho): o produto é a tela, não o telefone.
 */
export function Phone({
  src,
  alt,
  preload = false,
  sizes = "(min-width: 1024px) 340px, (min-width: 640px) 300px, 64vw",
  className = "",
  tone = "dark",
  screen = "dark",
}: {
  src: StaticImageData;
  alt: string;
  preload?: boolean;
  sizes?: string;
  className?: string;
  /** Cor do aro: escuro sobre palco claro também funciona; claro é para variar entre mockups. */
  tone?: "dark" | "light";
  /** Tema da captura: decide a cor da barra de status e do traço de início. */
  screen?: "dark" | "light";
}) {
  const frame =
    tone === "dark"
      ? "bg-[linear-gradient(145deg,#3a3a3e,#151517_40%,#2a2a2d)] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.14),0_0_0_1px_rgb(0_0_0/0.6)]"
      : "bg-[linear-gradient(145deg,#f4f4f6,#c9c9ce_45%,#ececef)] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.7),0_0_0_1px_rgb(0_0_0/0.12)]";
  const button = tone === "dark" ? "bg-[#2a2a2d]" : "bg-[#c9c9ce]";
  const ink = screen === "dark" ? "text-white" : "text-black";
  return (
    <figure className={`relative ${className}`}>
      {/* botões laterais */}
      <span aria-hidden="true" className={`absolute -left-[2px] top-[18%] h-[6%] w-[3px] rounded-l-sm ${button}`} />
      <span aria-hidden="true" className={`absolute -left-[2px] top-[26%] h-[6%] w-[3px] rounded-l-sm ${button}`} />
      <span aria-hidden="true" className={`absolute -right-[2px] top-[22%] h-[10%] w-[3px] rounded-r-sm ${button}`} />
      {/* aro: um pouco mais grosso que a borda da tela, como num aparelho de verdade */}
      <div className={`rounded-[16%/7.4%] p-[4.2%] ${frame}`}>
        {/* a tela: 390 x 844, a proporção da captura */}
        <div className={`@container relative overflow-hidden rounded-[12.5%/5.8%] bg-black ${ink}`}>
          <Image
            src={src}
            alt={alt}
            sizes={sizes}
            quality={90}
            preload={preload}
            placeholder="blur"
            className="block h-auto w-full"
          />
          <StatusBar />
          {/* câmera frontal: uma pílula discreta no meio da barra de status */}
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
