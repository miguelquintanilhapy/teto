import Link from "next/link";
import { EmptyRoom } from "@/components/brand";

export const metadata = { title: "Página não encontrada · Teto" };

/** 404 com a cara do Teto: a sala vazia, sob o telhado. */
export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-4 pb-16">
      <section className="rounded-card bg-card p-6 text-center">
        <EmptyRoom className="mx-auto" />
        <h1 className="t-title mt-4">Esta página saiu do ar</h1>
        <p className="t-body mt-2 text-label-2">O endereço não existe ou mudou de lugar. Seus dados continuam onde estavam.</p>
        <Link
          href="/"
          className="pressable mt-6 flex h-[3.375rem] w-full items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary"
        >
          Voltar ao painel
        </Link>
      </section>
    </main>
  );
}
