import Link from "next/link";

export const metadata = { title: "Página não encontrada · Teto" };

/** 404 na voz do app: "Esta página saiu do ar", com a sala vazia sob o telhado. */
export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-svh flex-col items-center justify-center bg-ink px-4 text-center">
      <svg width="104" height="138" viewBox="0 -22 104 138" fill="none" aria-hidden="true">
        <path d="M10,46 Q10,42 14,42 H90 Q94,42 94,46 V96 Q94,110 80,110 H24 Q10,110 10,96 Z" fill="rgb(255 255 255 / 0.06)" stroke="rgb(255 255 255 / 0.25)" strokeWidth="1.5" />
        <path d="M10,42 L52,15 L94,42" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
          const t = i / 10;
          return <circle key={i} cx={10 + 84 * t} cy={16 - 27 * (1 - Math.abs(t - 0.5) * 2)} r="3.25" fill="#ff9f0a" />;
        })}
      </svg>
      <h1 className="display mt-10 text-[clamp(2.5rem,1.8rem+3vw,4rem)] text-snow">Esta página saiu do ar.</h1>
      <p className="lead mt-5 max-w-[26rem] text-mute-dark">O endereço pode ter mudado. O resto do site continua no lugar.</p>
      <Link href="/" className="btn btn-primary mt-10">
        Voltar ao início
      </Link>
    </main>
  );
}
