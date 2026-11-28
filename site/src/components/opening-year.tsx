import { Reveal } from "./reveal";

/**
 * O limite proporcional do ano de abertura (docs/mei-rules.md): R$ 6.750 por mês, do mês de abertura
 * a dezembro, com o mês de abertura contado inteiro. Aberto em março: 10 meses, R$ 67.500; com os 20%
 * de tolerância, R$ 81.000. É o mesmo caso do MEI fictício da demonstração.
 */
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const OPENED = 2; // março

/** O traço cheio do telhado: o limite. */
function LimitIcon() {
  return (
    <svg viewBox="0 0 24 16" className="h-4 w-6 shrink-0" aria-hidden="true">
      <path d="M3,13 L12,5 L21,13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** O pontilhado do telhado: o limite com 20% de tolerância. */
function ToleranceIcon() {
  return (
    <svg viewBox="0 0 24 16" className="h-4 w-6 shrink-0 text-warn" aria-hidden="true" fill="currentColor">
      {[
        [3, 13],
        [7.5, 9],
        [12, 5],
        [16.5, 9],
        [21, 13],
      ].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="1.7" />
      ))}
    </svg>
  );
}

export function OpeningYear() {
  return (
    <section
      id="ano-de-abertura"
      data-nav="dark"
      aria-labelledby="abertura-titulo"
      className="bg-ink px-4 pb-32 pt-8 sm:px-6 sm:pb-44 lg:px-10"
    >
      <div className="mx-auto grid max-w-[80rem] items-center gap-x-20 gap-y-14 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <Reveal as="p" className="eyebrow text-warn">
            Ano de abertura
          </Reveal>
          <Reveal as="h2" id="abertura-titulo" className="display mt-5 max-w-[14ch] text-[clamp(2.5rem,1.5rem+4.2vw,5rem)] text-snow">
            Abriu seu MEI durante o ano?
          </Reveal>
          <Reveal as="p" delay={0.1} className="lead mt-7 max-w-[34rem] text-mute-dark">
            Seu limite pode ser diferente de R$&nbsp;81&nbsp;mil. No ano de abertura, ele é proporcional aos meses de atividade:
            R$&nbsp;6.750 por mês, contando inteiro o mês em que você abriu.
          </Reveal>
          <Reveal as="p" delay={0.15} className="mt-6 max-w-[34rem] text-[0.9375rem] leading-relaxed text-snow/80">
            O Teto faz essa conta sozinho, pela data de abertura do seu cadastro.
          </Reveal>
        </div>

        <Reveal as="figure" delay={0.1} className="rounded-[1.75rem] border border-line-dark bg-ink-2 p-6 sm:p-8">
          <figcaption className="text-[1.0625rem] font-semibold tracking-[-0.015em] text-snow">Exemplo: MEI aberto em março</figcaption>

          {/* os meses que contam: de março a dezembro */}
          <ol className="mt-6 grid grid-cols-12 gap-1" aria-label="Meses de atividade em 2026: de março a dezembro, 10 meses.">
            {MONTHS.map((m, i) => {
              const active = i >= OPENED;
              return (
                <li key={m} className="flex flex-col items-center gap-2">
                  <span aria-hidden="true" className={`block h-8 w-full rounded-md ${active ? "bg-snow/85" : "border border-dashed border-line-dark"}`} />
                  <span className={`text-[0.6875rem] tabular sm:text-xs ${active ? "text-snow" : "text-mute-dark"}`}>
                    <span className="sr-only">{active ? "conta: " : "não conta: "}</span>
                    {m}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 text-[0.9375rem] text-mute-dark tabular">
            10 meses × R$ 6.750 = <span className="font-semibold text-snow">R$ 67.500</span>
          </p>

          <dl className="mt-7 divide-y divide-line-dark border-t border-line-dark">
            <div className="py-5">
              <dt className="flex items-center gap-3 text-snow">
                <LimitIcon />
                <span className="text-[0.9375rem] text-mute-dark">Limite proporcional</span>
                <span className="ml-auto whitespace-nowrap text-[1.25rem] font-semibold sm:text-[1.375rem] tracking-[-0.02em] tabular">R$ 67.500</span>
              </dt>
              <dd className="mt-2 pl-9 text-[0.9375rem] leading-relaxed text-mute-dark">
                É o limite do ano, não uma faixa de alerta. Passou dele, passou do limite.
              </dd>
            </div>
            <div className="pt-5">
              <dt className="flex items-center gap-3 text-snow">
                <ToleranceIcon />
                <span className="text-[0.9375rem] text-mute-dark">Com a tolerância de 20%</span>
                <span className="ml-auto whitespace-nowrap text-[1.25rem] font-semibold sm:text-[1.375rem] tracking-[-0.02em] tabular">R$ 81.000</span>
              </dt>
              <dd className="mt-2 pl-9 text-[0.9375rem] leading-relaxed text-mute-dark">
                Até aqui, o ano termina como MEI, mas com imposto a mais sobre o que passou. Acima disso, o
                desenquadramento volta à data de abertura.
              </dd>
            </div>
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
