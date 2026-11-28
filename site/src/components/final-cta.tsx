import { QrCode } from "./qr-code";
import { Reveal } from "./reveal";
import { Roof } from "./roof";
import { APP_URL } from "@/lib/links";

/**
 * Fecho: o telhado da marca se desenha de novo, agora vazio, e a chamada para abrir o app.
 * No computador, um QR code leva direto ao celular, que é onde o Teto mora.
 */
export function FinalCta() {
  return (
    <section
      id="comecar"
      data-nav="dark"
      aria-labelledby="comecar-titulo"
      className="relative isolate overflow-hidden bg-ink px-4 pb-28 pt-16 sm:px-6 sm:pb-40 lg:px-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[58%] -z-10 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(10_111_223/0.18),rgb(255_159_10/0.06)_60%,transparent)] blur-2xl"
      />
      <div className="mx-auto flex max-w-[64rem] flex-col items-center text-center">
        <div className="w-[min(60vw,15rem)]">
          <Roof className="block w-full" delay={0.1} trigger="view" />
        </div>
        <Reveal as="h2" id="comecar-titulo" className="display mt-10 text-[clamp(2.75rem,1.4rem+5.6vw,6.5rem)] text-snow">
          Seu faturamento sob controle.
          <span className="block text-mute-dark">Seu MEI sem surpresas.</span>
        </Reveal>
        <Reveal as="p" delay={0.1} className="lead mt-8 max-w-[34rem] text-mute-dark">
          Acompanhe seus resultados, entenda seu limite e saiba quanto ainda cabe no seu faturamento anual.
        </Reveal>

        <Reveal delay={0.15} className="mt-10 flex flex-col items-center gap-10 lg:flex-row lg:gap-14">
          <div className="flex flex-col items-center gap-3">
            <a href={APP_URL} className="btn btn-primary min-h-[3.25rem] px-8 text-[1.0625rem]">
              Conhecer o Teto
            </a>
            <p className="text-sm text-mute-dark">Demonstração gratuita, sem cadastro.</p>
          </div>
          <div className="hidden items-center gap-5 text-left lg:flex">
            <QrCode value={APP_URL} label="QR code que abre o Teto no celular" className="size-28 rounded-2xl" />
            <p className="max-w-[11rem] text-sm leading-relaxed text-mute-dark">
              No computador? Aponte a câmera do celular para abrir lá.
            </p>
          </div>
        </Reveal>

        <Reveal as="p" delay={0.2} className="mt-14 max-w-[30rem] text-sm leading-relaxed text-mute-dark">
          A versão publicada mostra um MEI de demonstração, com dados fictícios. Valores de custo são sempre
          estimativas.
        </Reveal>
      </div>
    </section>
  );
}
