import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Imagem de compartilhamento (WhatsApp, LinkedIn, X): gerada no build, sem dado nenhum do app. */
export const alt = "Teto: quanto falta para o limite do seu MEI, antes de estourar.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logo = await readFile(join(process.cwd(), "src/assets/marca/teto-logo.png"), "base64");
/* Inter Tight SemiBold (licença OFL), recortada só com as letras desta imagem: o build não depende da rede.
   Para mudar o texto, baixe de novo com os novos caracteres (fonts.googleapis.com/css2?family=Inter+Tight:wght@600&text=...). */
const interTight = await readFile(join(process.cwd(), "src/assets/fontes/inter-tight-600-og.woff"));

/* Telhado cheio (limite) e pontilhado âmbar (limite + 20%), como na marca e na sala do app. */
const dots = Array.from({ length: 11 }, (_, i) => {
  const t = i / 10;
  return `<circle cx="${20 + 360 * t}" cy="${110 - 110 * (1 - Math.abs(t - 0.5) * 2)}" r="7" fill="#ff9f0a"/>`;
}).join("");
const roof = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 424 178">${dots}<path d="M20,152 L200,40 L380,152" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#000",
          fontFamily: "Inter Tight",
          color: "#fff",
        }}
      >
        <img src={`data:image/png;base64,${logo}`} width={150} height={81} alt="" />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
            <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -4.5, lineHeight: 1 }}>Quanto falta</div>
            <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -4.5, lineHeight: 1.05, color: "#a1a1a6" }}>
              para o teto.
            </div>
            <div style={{ marginTop: 28, fontSize: 30, letterSpacing: -0.5, color: "#a1a1a6" }}>
              O limite do MEI, à vista. Antes de estourar.
            </div>
          </div>
          <img src={`data:image/svg+xml;utf8,${encodeURIComponent(roof)}`} width={300} height={126} alt="" />
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Inter Tight", data: interTight, weight: 600, style: "normal" }] },
  );
}
