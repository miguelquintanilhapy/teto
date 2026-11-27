import { Logo } from "./logo";
import { APP_URL, REPO_URL, SECTIONS } from "@/lib/links";

/** Rodapé: atalhos, links externos e as ressalvas que o site precisa carregar. */
export function Footer() {
  return (
    <footer data-nav="dark" className="border-t border-line-dark bg-ink px-4 pb-12 pt-16 text-snow sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[80rem]">
        <div className="grid gap-12 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo className="w-[4.25rem]" />
            <p className="mt-5 max-w-[22rem] text-sm leading-relaxed text-mute-dark">
              Saiba quanto falta para o limite do seu MEI, antes de estourar.
            </p>
          </div>
          <nav aria-label="Seções">
            <h2 className="text-xs font-semibold text-snow">Nesta página</h2>
            <ul className="mt-3">
              {SECTIONS.map(({ id, label }) => (
                <li key={id}>
                  <a href={`#${id}`} className="inline-flex min-h-11 items-center text-sm text-mute-dark transition-colors hover:text-snow">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="text-xs font-semibold text-snow">Teto</h2>
            <ul className="mt-3">
              <li>
                <a href={APP_URL} className="inline-flex min-h-11 items-center text-sm text-mute-dark transition-colors hover:text-snow">
                  Abrir o Teto
                </a>
              </li>
              <li>
                <a href={REPO_URL} rel="noopener" className="inline-flex min-h-11 items-center text-sm text-mute-dark transition-colors hover:text-snow">
                  Código no GitHub
                </a>
              </li>
              <li>
                <a href={`${REPO_URL}/blob/main/LICENSE`} rel="noopener" className="inline-flex min-h-11 items-center text-sm text-mute-dark transition-colors hover:text-snow">
                  Licença MIT
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-line-dark pt-8 text-xs leading-relaxed text-mute-dark">
          <p>
            Projeto do Hack Brasil 2026, trilha Pagamentos &amp; finanças. Regras do MEI para 2026 (Lei Complementar
            123/2006). O Teto não substitui um contador; confirme no Portal do Empreendedor antes de decisões fiscais.
          </p>
        </div>
      </div>
    </footer>
  );
}
