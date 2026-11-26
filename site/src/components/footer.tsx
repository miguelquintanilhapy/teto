import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="border-t border-line-dark bg-ink px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-[80rem] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Logo className="w-[3.5rem]" />
        <p className="max-w-[40rem] text-sm leading-relaxed text-mute-dark sm:text-right">
          Projeto do Hack Brasil 2026, trilha Pagamentos &amp; finanças. O Teto não substitui um contador: valores de
          custo são estimativas.
        </p>
      </div>
    </footer>
  );
}
