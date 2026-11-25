import Link from "next/link";

/** Quando ainda não há MEI cadastrado: um convite com a saída à vista, no lugar de um aviso técnico. */
export function NoProfile({ text = "Com o CNPJ e a data de abertura, o Teto calcula o seu limite e avisa antes de você estourar." }: { text?: string }) {
  return (
    <section className="rounded-card bg-card p-6 text-center">
      <h2 className="t-title">Cadastre seu MEI</h2>
      <p className="t-body mt-2 text-label-2">{text}</p>
      <Link
        href="/bem-vindo"
        className="pressable mt-6 flex h-[3.375rem] w-full items-center justify-center rounded-full bg-primary text-[1.1875rem] font-bold text-on-primary"
      >
        Cadastrar
      </Link>
    </section>
  );
}
