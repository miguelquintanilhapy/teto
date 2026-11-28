"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { CheckCircle, Warning, WarningOctagon, ArrowsDownUp } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Reveal } from "./reveal";

/**
 * As faixas do limite em 2026, como o app explica em /regras (fonte: docs/mei-rules.md).
 * Nenhum número aqui é inventado: R$ 81.000 é o limite do ano; R$ 97.200, o limite com 20%;
 * R$ 6.750 por mês, o limite proporcional do ano de abertura.
 */
const STEPS: Array<{ kicker: string; title: string; body: string; aside?: string; icon: Icon; tone: string }> = [
  {
    // Receita bruta é o que vem da venda de bens e serviços (LC 123/2006, art. 3º, §1º), não todo dinheiro que entra.
    kicker: "Receita bruta",
    title: "O que conta como faturamento?",
    body: "O valor bruto das suas vendas e serviços, sem descontar os custos do negócio. Quem não soma ao longo do ano perde a noção de quanto já foi.",
    aside: "Mas nem todo dinheiro que entra na conta é faturamento: transferência entre contas suas, empréstimo e outros valores que não vêm de venda ou serviço ficam de fora.",
    icon: ArrowsDownUp,
    tone: "text-mute-dark",
  },
  {
    // LC 123, art. 18-A, §§1º e 2º; para 2027, LC 238/2026 (condicionada à previsão no orçamento).
    kicker: "Até R$ 81.000",
    title: "Dentro do limite, tudo certo.",
    body: "Em 2026, o limite é de R$ 81.000. Quem abriu o MEI no meio do ano tem um limite proporcional: R$ 6.750 por mês de atividade.",
    aside: "Para 2027, a lei já prevê um limite de R$ 110.000, desde que o orçamento do ano confirme.",
    icon: CheckCircle,
    tone: "text-ok",
  },
  {
    // LC 123, art. 18-A, §7º, III "a" e IV "a": segue MEI no ano e sai em 1º de janeiro; comunica até o último dia útil do mês seguinte.
    kicker: "De R$ 81.000 a R$ 97.200",
    title: "Passou até 20%: o ano fecha com custo.",
    body: "A tolerância não é uma folga. Você termina o ano como MEI, mas paga imposto a mais sobre o que passou e deixa de ser MEI em 1º de janeiro do ano seguinte.",
    aside: "E precisa comunicar o desenquadramento à Receita até o último dia útil do mês seguinte ao que passou do limite.",
    icon: Warning,
    tone: "text-alert",
  },
  {
    // LC 123, art. 18-A, §7º, III "b" e IV "b": desenquadramento retroativo, diferenças com encargos legais.
    kicker: "Acima de R$ 97.200",
    title: "Passou de 20%: a conta volta no tempo.",
    body: "Deixa de ser MEI desde 1º de janeiro, ou desde a abertura, se abriu no mesmo ano. Os impostos do período são recalculados, e a diferença é paga com juros e multa. É aqui que a surpresa custa caro.",
    icon: WarningOctagon,
    tone: "text-danger",
  },
];

/* Geometria da sala (a mesma ideia do app): a altura da sala é o limite; o pontilhado, o limite + 20%. */
const LEFT = 20;
const RIGHT = 240;
const FLOOR = 400;
const LIMIT_Y = 150; // 100%
const TOL_Y = 100; // 120%
const PER_UNIT = FLOOR - LIMIT_Y; // 250 px = 100% do limite
const DOTS = Array.from({ length: 11 }, (_, i) => {
  const t = i / 10;
  const x = LEFT + (RIGHT - LEFT) * t;
  const y = TOL_Y - 68 * (1 - Math.abs(t - 0.5) * 2);
  return [x, y] as const;
});

/** Cor do preenchimento por faixa, nos tons do app: verde, âmbar (80%), laranja (100%), vermelho (120%). */
function useFillColor(ratio: MotionValue<number>) {
  return useTransform(
    ratio,
    [0, 0.79, 0.8, 0.99, 1, 1.19, 1.2, 2],
    ["#30d158", "#30d158", "#ff9f0a", "#ff9f0a", "#ff6a2a", "#ff6a2a", "#ff453a", "#ff453a"],
  );
}

function RoomScene({ ratio }: { ratio: MotionValue<number> }) {
  const fillY = useTransform(ratio, (r) => FLOOR - PER_UNIT * r);
  const fill = useFillColor(ratio);
  const dotsColor = useTransform(ratio, [0, 1.19, 1.2, 2], ["#ff9f0a", "#ff9f0a", "#ff453a", "#ff453a"]);
  const pct = useTransform(ratio, (r) => `${Math.round(r * 100)}%`);

  return (
    <svg viewBox="0 0 420 420" className="h-full w-full" role="img" aria-label="A sala do limite enchendo: o telhado cheio é o limite de R$ 81.000; o pontilhado, R$ 97.200, os 20% de tolerância.">
      <defs>
        <clipPath id="problem-room">
          <path d={`M${LEFT},0 H${RIGHT} V${FLOOR - 16} Q${RIGHT},${FLOOR} ${RIGHT - 16},${FLOOR} H${LEFT + 16} Q${LEFT},${FLOOR} ${LEFT},${FLOOR - 16} Z`} />
        </clipPath>
      </defs>

      {/* paredes */}
      <path
        d={`M${LEFT},${LIMIT_Y + 4} V${FLOOR - 16} Q${LEFT},${FLOOR} ${LEFT + 16},${FLOOR} H${RIGHT - 16} Q${RIGHT},${FLOOR} ${RIGHT},${FLOOR - 16} V${LIMIT_Y + 4}`}
        fill="rgb(255 255 255 / 0.06)"
        stroke="rgb(255 255 255 / 0.22)"
        strokeWidth="1.5"
      />

      {/* o que já entrou */}
      <g clipPath="url(#problem-room)">
        <motion.rect x={LEFT} width={RIGHT - LEFT} height={FLOOR} style={{ y: fillY, fill }} />
      </g>

      {/* limite + 20% */}
      {DOTS.map(([cx, cy]) => (
        <motion.circle key={cx} cx={cx} cy={cy} r="5.5" style={{ fill: dotsColor }} />
      ))}
      {/* limite */}
      <path d={`M${LEFT},${LIMIT_Y} L${(LEFT + RIGHT) / 2},${LIMIT_Y - 68} L${RIGHT},${LIMIT_Y}`} fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />

      {/* réguas */}
      <g fontFamily="var(--font-sans)" fontSize="13" fill="#a1a1a6">
        <line x1="252" x2="266" y1={LIMIT_Y} y2={LIMIT_Y} stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <text x="276" y={LIMIT_Y + 4.5}>
          <tspan fill="#fff" fontWeight="600">R$ 81.000</tspan> limite
        </text>
        <line x1="252" x2="266" y1={TOL_Y} y2={TOL_Y} stroke="#ff9f0a" strokeWidth="2" strokeDasharray="1 4" strokeLinecap="round" />
        <text x="276" y={TOL_Y + 4.5}>
          <tspan fill="#fff" fontWeight="600">R$ 97.200</tspan> +20%
        </text>
        <motion.text x="276" y={FLOOR - 2} fontSize="40" fontWeight="600" fill="#fff" style={{ letterSpacing: "-0.04em" }} className="tabular">
          {pct}
        </motion.text>
        <text x="278" y={FLOOR - 50}>do limite</text>
      </g>
    </svg>
  );
}

function Step({ index, onActive, active }: { index: number; onActive: (i: number) => void; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);
  const { kicker, title, body, aside, icon: StepIcon, tone } = STEPS[index];
  return (
    <div ref={ref} className="flex min-h-[62svh] items-center lg:min-h-[78svh]">
      <div className={`transition-opacity duration-500 ${active ? "lg:opacity-100" : "lg:opacity-30"}`}>
        <p className={`eyebrow flex items-center gap-2 ${tone}`}>
          <StepIcon size={18} weight="fill" aria-hidden="true" />
          {kicker}
        </p>
        <h3 className="display mt-4 text-[clamp(2rem,1.3rem+2.6vw,3.5rem)] text-snow">{title}</h3>
        <p className="lead mt-5 max-w-[30rem] text-mute-dark">{body}</p>
        {aside ? <p className="mt-5 max-w-[30rem] text-[0.9375rem] leading-relaxed text-snow/80">{aside}</p> : null}
      </div>
    </div>
  );
}

/**
 * O problema, contado pela própria regra: a sala enche conforme a página rola,
 * atravessa o telhado (o limite) e depois o pontilhado (os 20%). Cada faixa tem cor, ícone e texto.
 */
export function Problem() {
  const scene = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: scene, offset: ["start center", "end center"] });
  const raw = useTransform(scrollYProgress, [0, 0.125, 0.375, 0.625, 0.875, 1], [0.1, 0.36, 0.74, 1.1, 1.33, 1.38]);
  const ratio = useSpring(raw, { stiffness: 120, damping: 24, mass: 0.6 });

  return (
    <section id="problema" data-nav="dark" aria-labelledby="problema-titulo" className="relative bg-ink px-4 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[80rem] pt-28 sm:pt-40">
        <Reveal as="p" className="eyebrow text-warn">
          O problema
        </Reveal>
        <Reveal as="h2" id="problema-titulo" className="display mt-5 max-w-[14ch] text-[clamp(2.75rem,1.6rem+5vw,6rem)] text-snow">
          O limite não avisa quando chega.
        </Reveal>
        <Reveal as="p" delay={0.1} className="lead mt-7 max-w-[38rem] text-mute-dark">
          Muitos MEIs não somam o que faturam e só descobrem que passaram do limite anual quando o imposto já é
          retroativo. Veja o que acontece conforme o ano enche a sala.
        </Reveal>
      </div>

      <div ref={scene} className="relative mx-auto grid max-w-[80rem] gap-x-16 pb-4 lg:grid-cols-[1fr_1.05fr] lg:pb-0">
        {/* a sala: fixa enquanto o texto rola (no celular, presa no alto, sobre um fundo) */}
        <div className="sticky top-14 z-10 -mx-4 bg-ink px-4 py-4 sm:-mx-6 sm:px-6 lg:order-2 lg:top-0 lg:mx-0 lg:flex lg:h-svh lg:items-center lg:bg-transparent lg:p-0">
          <div className="mx-auto h-[32svh] max-h-[26rem] w-full max-w-[26rem] lg:h-[34rem] lg:max-h-none lg:max-w-[34rem]">
            <RoomScene ratio={ratio} />
          </div>
        </div>
        <div className="lg:order-1">
          {STEPS.map((_, i) => (
            <Step key={i} index={i} active={active === i} onActive={setActive} />
          ))}
        </div>
      </div>

      <p className="mx-auto max-w-[80rem] pb-16 text-sm leading-relaxed text-mute-dark lg:pb-24">
        <span className="block max-w-[44rem]">
          Resumo das regras de 2026, pela Lei Complementar 123/2006. Cada caso tem detalhes: antes de decidir, confirme
          com um contador.
        </span>
      </p>
    </section>
  );
}
