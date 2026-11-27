"use client";

import { useEffect, useRef, useState } from "react";
import type { StaticImageData } from "next/image";
import { AnimatePresence, motion, useInView } from "motion/react";
import {
  BellRinging,
  BookOpenText,
  ClockCounterClockwise,
  DeviceMobile,
  EyeSlash,
  FileCsv,
  Bank,
  MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Phone } from "./phone";
import { Reveal } from "./reveal";
import { EASE } from "@/lib/motion";
import painel from "@/assets/telas/painel-claro.webp";
import enviar from "@/assets/telas/enviar-escuro.webp";
import simular from "@/assets/telas/simular-escuro.webp";
import previsao from "@/assets/telas/painel-previsao-escuro.webp";

type Chapter = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  note?: string;
  shot: StaticImageData;
  /** Tema da captura, para a barra de status do celular. */
  screen: "dark" | "light";
  alt: string;
};

/** Cada capítulo descreve só o que a tela mostra (capturas do app publicado, dados fictícios). */
const CHAPTERS: Chapter[] = [
  {
    id: "painel",
    kicker: "Painel",
    title: "Quanto falta, num número só.",
    body: "O faturamento do ano, a faixa de risco e quanto ainda cabe no limite. A sala enche conforme você fatura: o telhado é o limite, e o pontilhado, os 20% de tolerância.",
    note: "O risco nunca vem só em cor: sempre com ícone e texto.",
    shot: painel,
    screen: "light",
    alt: "Painel em tema claro: faturamento de 2026 de R$ 60.710,50, selo Atenção, 89% do limite e ainda cabem R$ 6.789, com a sala do limite cheia em âmbar.",
  },
  {
    id: "enviar",
    kicker: "Enviar nota",
    title: "Fotografe a nota. A IA lê, você confere.",
    body: "Foto, PDF ou comprovante de Pix. A IA só extrai os campos; nada entra no limite antes de você conferir. E quem decide se é receita ou despesa é o código, pelo CNPJ do seu MEI.",
    note: "Sem comprovante? Dá para lançar à mão uma venda em dinheiro ou Pix.",
    shot: enviar,
    screen: "dark",
    alt: "Tela Enviar nota: foto, PDF ou comprovante de Pix; a IA lê os dados e você confere antes de somar ao limite. Botões Tirar foto e Escolher arquivo, e o atalho Lançar sem nota.",
  },
  {
    id: "simular",
    kicker: "Simular",
    title: "E se eu aceitar essa venda?",
    body: "Digite o valor e a resposta aparece enquanto você digita: quanto ainda cabe, ou quanto a venda passa do limite, com a consequência em português e o custo extra estimado.",
    note: "Na tela, uma venda de R$ 12.000 passaria do limite em R$ 5.210.",
    shot: simular,
    screen: "dark",
    alt: "Simulação de uma venda de R$ 12.000: acima do limite, 107%. A venda passa do limite em R$ 5.210; até R$ 81.000, o ano termina como MEI, mas com imposto a mais sobre o que passou.",
  },
  {
    id: "previsao",
    kicker: "Previsão e DAS",
    title: "Saiba como o ano vai fechar.",
    body: "Pela média de receita desde a abertura, o Teto projeta onde o ano termina e se o limite será ultrapassado. A previsão muda a cada nova receita. E o DAS do mês aparece com a data e um atalho para gerar a guia.",
    shot: previsao,
    screen: "dark",
    alt: "Previsão: você deve passar do limite em 28 de dezembro; no ritmo atual, 2026 fecha em R$ 68.299. DAS vence em 20 de dezembro, com o atalho Gerar guia. Notas em dia e gráfico de receita por mês.",
  },
];

const MORE: Array<{ icon: Icon; title: string; body: string }> = [
  { icon: BellRinging, title: "Avisos por e-mail", body: "Aos 80%, 90%, 100% e 120% do limite, uma vez por faixa." },
  { icon: ClockCounterClockwise, title: "Histórico que não apaga", body: "Corrigir e cancelar ficam registrados, com aviso de possível duplicidade." },
  { icon: Bank, title: "Extrato do banco", body: "O CSV é lido no próprio navegador e cruzado com as receitas: entradas sem nota, notas sem entrada." },
  { icon: FileCsv, title: "Relatório do ano", body: "Receita mês a mês, em CSV ou em PDF pela impressão." },
  { icon: EyeSlash, title: "Ocultar valores", body: "Troca os valores por uma barra lisa, para abrir o app em público." },
  { icon: BookOpenText, title: "Regras em português", body: "Limite, faixas e DAS explicados para quem nunca ouviu falar em desenquadramento." },
  { icon: MagnifyingGlass, title: "A IA sem caixa-preta", body: "Uma tela mostra como a IA lê, os modelos usados e a cota do dia." },
  { icon: DeviceMobile, title: "Direto no celular", body: "Funciona no navegador, em tema claro ou escuro, e se instala na tela inicial." },
];

function ChapterText({ chapter, index, onActive }: { chapter: Chapter; index: number; onActive: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-48% 0px -48% 0px" });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  return (
    <div ref={ref} id={`recurso-${chapter.id}`} className="flex flex-col justify-center py-14 lg:min-h-svh lg:py-0">
      <Reveal>
        <p className="eyebrow text-action-light">{chapter.kicker}</p>
        <h3 className="display mt-4 text-[clamp(2.1rem,1.4rem+2.6vw,3.75rem)] text-graphite">{chapter.title}</h3>
        <p className="lead mt-5 max-w-[31rem] text-mute-light">{chapter.body}</p>
        {chapter.note ? <p className="mt-5 max-w-[31rem] text-[0.9375rem] leading-relaxed text-graphite/80">{chapter.note}</p> : null}
      </Reveal>
      {/* no celular, cada capítulo traz a sua tela */}
      <Reveal className="mx-auto mt-12 w-[min(64vw,18rem)] lg:hidden">
        <Phone src={chapter.shot} screen={chapter.screen} alt={chapter.alt} className="drop-shadow-[0_40px_60px_rgb(0_0_0/0.22)]" />
      </Reveal>
    </div>
  );
}

/**
 * Os recursos, sobre o palco claro. No computador, o celular fica preso enquanto os capítulos rolam,
 * e a tela troca com um fundido curto; no celular, cada capítulo traz a sua captura.
 */
export function Features() {
  const [active, setActive] = useState(0);
  const chapter = CHAPTERS[active];

  return (
    <section
      id="recursos"
      aria-labelledby="recursos-titulo"
      data-nav="light"
      className="relative z-10 -mt-10 rounded-t-[2.5rem] bg-paper px-4 pb-24 pt-24 text-graphite sm:px-6 sm:pt-32 lg:px-10 lg:pb-36"
    >
      <div className="mx-auto max-w-[80rem]">
        <Reveal as="p" className="eyebrow text-action-light">
          O app
        </Reveal>
        <Reveal as="h2" id="recursos-titulo" className="display mt-5 max-w-[16ch] text-[clamp(2.75rem,1.6rem+5vw,6rem)]">
          O limite do ano, sempre à vista.
        </Reveal>
        <Reveal as="p" delay={0.1} className="lead mt-7 max-w-[36rem] text-mute-light">
          Quatro abas e um botão para enviar a nota. Tudo pensado para o celular, para quem não tem tempo de abrir
          planilha.
        </Reveal>

        <div className="mt-8 grid gap-x-20 lg:mt-0 lg:grid-cols-2">
          <div>
            {CHAPTERS.map((c, i) => (
              <ChapterText key={c.id} chapter={c} index={i} onActive={setActive} />
            ))}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-0 flex h-svh items-center justify-center">
              <div className="relative w-[20rem]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={chapter.id}
                    initial={{ opacity: 0, y: 28, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.98 }}
                    transition={{ duration: 0.6, ease: EASE }}
                  >
                    <Phone src={chapter.shot} screen={chapter.screen} alt={chapter.alt} sizes="320px" className="drop-shadow-[0_50px_70px_rgb(0_0_0/0.25)]" />
                  </motion.div>
                </AnimatePresence>
                {/* onde estamos: um ponto por capítulo */}
                <ol className="mt-8 flex justify-center gap-2" aria-label="Capítulos">
                  {CHAPTERS.map((c, i) => (
                    <li key={c.id}>
                      <a
                        href={`#recurso-${c.id}`}
                        aria-label={c.kicker}
                        aria-current={i === active ? "step" : undefined}
                        className="flex h-6 items-center px-1"
                      >
                        <span className={`block h-1.5 rounded-full transition-all duration-500 ${i === active ? "w-6 bg-graphite" : "w-1.5 bg-graphite/25"}`} />
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* o resto, em cartões curtos */}
        <div className="mt-24 lg:mt-12">
          <Reveal as="h3" className="display max-w-[20ch] text-[clamp(1.9rem,1.3rem+2.2vw,3rem)]">
            E o que mais o MEI precisa no dia a dia.
          </Reveal>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MORE.map(({ icon: ItemIcon, title, body }, i) => (
              <Reveal as="li" key={title} delay={(i % 4) * 0.06} className="rounded-[1.75rem] bg-snow p-7 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
                <ItemIcon size={28} weight="duotone" className="text-action-light" aria-hidden="true" />
                <h4 className="mt-5 text-[1.0625rem] font-semibold tracking-[-0.015em]">{title}</h4>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-mute-light">{body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
