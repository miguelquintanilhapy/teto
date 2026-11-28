import { Calculator, FileArrowUp, Scan } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Reveal } from "./reveal";

/**
 * Como a IA entra no Teto, sem exagero (docs/AI-ENGINEERING.md): ela só extrai os campos da nota;
 * o código valida, decide receita ou despesa pelo CNPJ do MEI e faz todas as contas. Nada soma sem
 * a confirmação de quem usa.
 */
const STEPS: Array<{ icon: Icon; who: string; title: string; body: string }> = [
  {
    icon: FileArrowUp,
    who: "Você",
    title: "Envia a nota",
    body: "Uma foto, um PDF ou o comprovante de Pix, direto do celular.",
  },
  {
    icon: Scan,
    who: "A IA",
    title: "Lê os dados",
    body: "Valor, data e os CNPJs de quem vendeu e de quem comprou. O código confere os dígitos, a data e o valor, e você revisa tudo antes de confirmar.",
  },
  {
    icon: Calculator,
    who: "O Teto",
    title: "Faz as contas",
    body: "Pelo CNPJ do seu MEI, o código decide se é receita ou despesa. Só a receita confirmada entra no faturamento, no limite e na previsão.",
  },
];

export function AiExplainer() {
  return (
    <section
      id="ia"
      data-nav="light"
      aria-labelledby="ia-titulo"
      className="relative z-10 -mt-10 rounded-t-[2.5rem] bg-paper px-4 py-24 text-graphite sm:px-6 sm:py-32 lg:px-10"
    >
      <div className="mx-auto max-w-[80rem]">
        <Reveal as="p" className="eyebrow text-action-light">
          Inteligência artificial
        </Reveal>
        <Reveal as="h2" id="ia-titulo" className="display mt-5 text-[clamp(2.75rem,1.6rem+5vw,6rem)]">
          A IA lê.
          <span className="block text-mute-light">O código decide.</span>
        </Reveal>
        <Reveal as="p" delay={0.1} className="lead mt-7 max-w-[38rem] text-mute-light">
          Inteligência artificial para facilitar, regras para garantir. O Teto usa IA para identificar as informações
          das notas fiscais. Depois, o próprio sistema confere esses dados e calcula o faturamento, os limites e as
          projeções.
        </Reveal>

        <ol className="mt-16 grid gap-4 lg:mt-20 lg:grid-cols-3">
          {STEPS.map(({ icon: StepIcon, who, title, body }, i) => (
            <Reveal as="li" key={title} delay={i * 0.08} className="relative flex flex-col rounded-[1.75rem] bg-snow p-7 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-8">
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-graphite/[0.06]">
                  <StepIcon size={26} weight="duotone" className="text-graphite" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-mute-light tabular" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="eyebrow mt-7 text-mute-light">
                <span className="sr-only">Passo {i + 1}: </span>
                {who}
              </p>
              <h3 className="mt-2 text-[clamp(1.375rem,1.2rem+0.6vw,1.75rem)] font-semibold tracking-[-0.025em]">{title}</h3>
              <p className="mt-3 text-[1rem] leading-relaxed text-mute-light">{body}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal as="p" delay={0.1} className="mt-10 max-w-[44rem] text-[0.9375rem] leading-relaxed text-graphite/80">
          Nada entra no limite sem a sua confirmação. E uma tela do app mostra os modelos de IA usados, a cota do dia e
          o caminho de cada leitura.
        </Reveal>
      </div>
    </section>
  );
}
