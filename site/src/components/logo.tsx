import logo from "@/assets/marca/teto-logo.png";

/**
 * O logo oficial (telhado sobre o T), recortado e com fundo transparente
 * (gerado a partir de public/brand/teto-logo-branca-fundo-preto.png do app).
 * Entra como máscara: a cor vem do texto (`currentColor`), então serve sobre vidro, claro ou escuro.
 */
export function Logo({ className = "w-[4.25rem]" }: { className?: string }) {
  const mask = `url(${logo.src})`;
  return (
    <span
      aria-hidden="true"
      className={`block aspect-[880/474] bg-current ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }}
    />
  );
}
