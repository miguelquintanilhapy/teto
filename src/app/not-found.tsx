import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

export const metadata = { title: "Página não encontrada · Teto" };

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-4 pb-16">
      <section className="rounded-card bg-card p-6 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-tile">
          <MagnifyingGlass size={34} weight="bold" aria-hidden="true" />
        </span>
        <h1 className="t-title mt-4">Página não encontrada</h1>
        <p className="t-body mt-2 text-label-2">O endereço não existe ou mudou de lugar.</p>
        <Link
          href="/"
          className="mt-6 flex h-[3.375rem] w-full items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary"
        >
          Voltar ao painel
        </Link>
      </section>
    </main>
  );
}
