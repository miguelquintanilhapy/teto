import { SheetShell } from "@/components/send/sheet-shell";

export const metadata = { title: "Instalar no celular · Teto" };

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="mt-3 rounded-card bg-card p-5">
      <h2 className="t-title">{title}</h2>
      <ol className="mt-3 flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3">
            <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-tile text-[0.9375rem] font-bold">
              {i + 1}
            </span>
            <span className="t-body pt-px">{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function InstalarPage() {
  return (
    <SheetShell title="Instalar no celular" closeHref="/perfil">
      <p className="t-body px-1 text-label-2">
        O Teto abre como um app de verdade: com o ícone na tela inicial e sem a barra do navegador. Não precisa de loja de aplicativos.
      </p>
      <Steps
        title="No iPhone (Safari)"
        steps={["Abra o Teto no Safari.", "Toque em Compartilhar, o quadrado com a seta para cima.", "Role e toque em “Adicionar à Tela de Início”.", "Toque em Adicionar."]}
      />
      <Steps
        title="No Android (Chrome)"
        steps={["Abra o Teto no Chrome.", "Toque nos três pontinhos, no canto de cima.", "Toque em “Instalar app” ou “Adicionar à tela inicial”.", "Confirme."]}
      />
      <p className="t-sub mt-4 px-1 text-label-2">
        Se a opção não aparecer, confira se está no Safari (iPhone) ou no Chrome (Android): outros navegadores podem não oferecer a instalação.
      </p>
    </SheetShell>
  );
}
