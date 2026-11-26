import Image, { type StaticImageData } from "next/image";

/**
 * Moldura de celular desenhada em CSS para as capturas reais do app.
 * Genérica de propósito (sem marca de aparelho): o produto é a tela, não o telefone.
 */
export function Phone({
  src,
  alt,
  preload = false,
  sizes = "(min-width: 1024px) 340px, (min-width: 640px) 300px, 70vw",
  className = "",
  tone = "dark",
}: {
  src: StaticImageData;
  alt: string;
  preload?: boolean;
  sizes?: string;
  className?: string;
  /** Cor do aro: escuro sobre palco claro também funciona; claro é para variar entre mockups. */
  tone?: "dark" | "light";
}) {
  const frame =
    tone === "dark"
      ? "bg-[linear-gradient(145deg,#3a3a3e,#151517_40%,#2a2a2d)] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.14),0_0_0_1px_rgb(0_0_0/0.6)]"
      : "bg-[linear-gradient(145deg,#f4f4f6,#c9c9ce_45%,#ececef)] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.7),0_0_0_1px_rgb(0_0_0/0.12)]";
  return (
    <figure className={`relative ${className}`}>
      {/* botões laterais */}
      <span aria-hidden="true" className={`absolute -left-[2px] top-[22%] h-[7%] w-[3px] rounded-l-sm ${tone === "dark" ? "bg-[#2a2a2d]" : "bg-[#c9c9ce]"}`} />
      <span aria-hidden="true" className={`absolute -left-[2px] top-[31%] h-[7%] w-[3px] rounded-l-sm ${tone === "dark" ? "bg-[#2a2a2d]" : "bg-[#c9c9ce]"}`} />
      <span aria-hidden="true" className={`absolute -right-[2px] top-[26%] h-[11%] w-[3px] rounded-r-sm ${tone === "dark" ? "bg-[#2a2a2d]" : "bg-[#c9c9ce]"}`} />
      <div className={`rounded-[15%/7%] p-[3.2%] ${frame}`}>
        <div className="relative overflow-hidden rounded-[12.5%/5.8%] bg-black">
          <Image
            src={src}
            alt={alt}
            sizes={sizes}
            quality={90}
            preload={preload}
            placeholder="blur"
            className="block h-auto w-full"
          />
          {/* câmera frontal: uma cápsula discreta */}
          <span aria-hidden="true" className="absolute left-1/2 top-[1.4%] h-[3.3%] w-[29%] -translate-x-1/2 rounded-full bg-black" />
          {/* reflexo leve do vidro */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/0.07),transparent_38%)]" />
        </div>
      </div>
    </figure>
  );
}
