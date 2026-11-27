import { Reveal } from "./reveal";
import { REPO_URL } from "@/lib/links";

/** Os princípios do projeto, tirados do README e do AGENTS.md (não são slogans). */
const PRINCIPLES = [
  {
    title: "A IA lê. O código decide.",
    body: "O modelo só extrai os campos da nota. Limite, risco, previsão e avisos são regras escritas em código e testadas.",
  },
  {
    title: "Você confere antes de contar.",
    body: "Nenhum valor entra no limite sem a sua confirmação. Corrigir e cancelar ficam registrados.",
  },
  {
    title: "Sem prometer o que não é.",
    body: "Valores de custo são sempre estimativas, e o Teto não substitui um contador. O código é aberto, com licença MIT.",
  },
];

/** Quem somos: o propósito do projeto e como ele foi feito. */
export function About() {
  return (
    <section id="quem-somos" data-nav="dark" aria-labelledby="quem-somos-titulo" className="bg-ink px-4 py-28 sm:px-6 sm:py-40 lg:px-10">
      <div className="mx-auto max-w-[80rem]">
        <Reveal as="p" className="eyebrow text-warn">
          Quem somos
        </Reveal>
        <Reveal as="h2" id="quem-somos-titulo" className="display mt-5 max-w-[17ch] text-[clamp(2.75rem,1.6rem+5vw,6rem)] text-snow">
          Ninguém deveria descobrir o limite pela multa.
        </Reveal>
        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-2 lg:gap-24">
          <Reveal as="p" delay={0.05} className="lead text-mute-dark">
            O Teto nasceu no <span className="text-snow">Hack Brasil 2026</span>, na trilha Pagamentos &amp; finanças,
            feito por um time de três pessoas. A pergunta era simples: por que o MEI só descobre que passou do limite
            quando o imposto já é retroativo?
          </Reveal>
          <Reveal as="p" delay={0.1} className="lead text-mute-dark">
            A resposta virou um app que faz a soma por você, explica a regra em português e avisa antes. Pequeno de
            propósito: uma pergunta, respondida bem.
          </Reveal>
        </div>

        <ul className="mt-20 grid gap-px overflow-hidden rounded-[2rem] bg-line-dark lg:mt-28 lg:grid-cols-3">
          {PRINCIPLES.map(({ title, body }, i) => (
            <Reveal as="li" key={title} delay={i * 0.08} className="bg-ink-2 p-8 sm:p-10">
              <span className="text-sm font-semibold text-warn tabular">0{i + 1}</span>
              <h3 className="mt-6 text-[1.5rem] font-semibold leading-tight tracking-[-0.028em] text-snow">{title}</h3>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-mute-dark">{body}</p>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-12">
          <a href={REPO_URL} className="link-arrow" rel="noopener">
            Ver o código no GitHub
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M4 10 10 4m0 0H5m5 0v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
