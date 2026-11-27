import { CalendarPlus, CurrencyCircleDollar, Gauge, Receipt } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Reveal } from "./reveal";

/** Cada perfil aponta para o que o app já faz por ele; nada de promessa que o app não cumpre. */
const PROFILES: Array<{ icon: Icon; who: string; how: string }> = [
  {
    icon: CurrencyCircleDollar,
    who: "Vende no Pix e em dinheiro",
    how: "Lança a venda sem nota em segundos, e ela já conta no limite.",
  },
  {
    icon: Receipt,
    who: "Emite nota para empresa",
    how: "Fotografa a nota; a IA lê e você confere antes de somar.",
  },
  {
    icon: CalendarPlus,
    who: "Abriu o MEI este ano",
    how: "O limite é proporcional aos meses de atividade, e o Teto já faz essa conta.",
  },
  {
    icon: Gauge,
    who: "Está chegando perto do limite",
    how: "Simula a próxima venda e vê o efeito, e o custo estimado, antes de aceitar.",
  },
];

/** Para quem é: o microempreendedor individual que cuida sozinho das próprias contas. */
export function Audience() {
  return (
    <section id="para-quem" data-nav="light" aria-labelledby="para-quem-titulo" className="bg-paper px-4 py-28 text-graphite sm:px-6 sm:py-40 lg:px-10">
      <div className="mx-auto grid max-w-[80rem] gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-24">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Reveal as="p" className="eyebrow text-action-light">
            Para quem é
          </Reveal>
          <Reveal as="h2" id="para-quem-titulo" className="display mt-5 max-w-[13ch] text-[clamp(2.75rem,1.6rem+4.4vw,5.5rem)]">
            Para o MEI que é o próprio financeiro.
          </Reveal>
          <Reveal as="p" delay={0.1} className="lead mt-7 max-w-[30rem] text-mute-light">
            Quem fatura, emite, recebe e ainda precisa lembrar quanto já entrou no ano. O Teto faz a soma e mostra o
            que ela significa.
          </Reveal>
        </div>

        <ul className="divide-y divide-line-light border-y border-line-light">
          {PROFILES.map(({ icon: ProfileIcon, who, how }, i) => (
            <Reveal as="li" key={who} delay={i * 0.05} className="flex gap-6 py-9 sm:gap-8 sm:py-11">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-snow shadow-[0_1px_2px_rgb(0_0_0/0.05)]">
                <ProfileIcon size={28} weight="duotone" className="text-action-light" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-[clamp(1.375rem,1.15rem+0.8vw,1.875rem)] font-semibold tracking-[-0.028em]">{who}</h3>
                <p className="mt-2 max-w-[32rem] text-[1.0625rem] leading-relaxed text-mute-light">{how}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>

      <Reveal as="p" className="mx-auto mt-14 max-w-[80rem] text-sm text-mute-light">
        O MEI caminhoneiro tem um limite diferente e ainda fica de fora.
      </Reveal>
    </section>
  );
}
