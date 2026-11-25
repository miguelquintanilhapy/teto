import Link from "next/link";
import { Suspense } from "react";
import { CaretRight, CheckCircle, Circle } from "@phosphor-icons/react/dist/ssr";
import { SheetShell } from "@/components/send/sheet-shell";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Primeiros passos · Teto" };

export default function PrimeirosPassosPage() {
  return (
    <SheetShell title="Primeiros passos" closeHref="/perfil">
      <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Conteudo />
      </Suspense>
    </SheetShell>
  );
}

interface Step {
  title: string;
  text: string;
  done: boolean;
  href: string;
  cta: string;
}

async function Conteudo() {
  const r = await loadPanelSafe("primeiros-passos");
  const hasProfile = r.ok;
  const hasNote = r.ok && r.panel.dashboard.confirmedRevenueCount > 0;
  const hasEmail = r.ok && r.panel.profile.email.trim() !== "";

  const steps: Step[] = [
    {
      title: "Cadastre seu MEI",
      text: "Com o CNPJ e a data de abertura, o Teto calcula o seu limite.",
      done: hasProfile,
      href: hasProfile ? "/perfil" : "/bem-vindo",
      cta: hasProfile ? "Ver perfil" : "Cadastrar",
    },
    {
      title: "Envie sua primeira nota",
      text: "Foto, PDF ou XML. A IA lê, você confere, e só então a receita entra no limite.",
      done: hasNote,
      href: "/enviar",
      cta: "Enviar nota",
    },
    {
      title: "Ligue os alertas",
      text: "Receba um e-mail ao chegar em cada faixa do limite, antes de estourar.",
      done: hasEmail,
      href: "/alertas",
      cta: "Ver alertas",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <p className="t-body px-1 text-label-2" role="status">
        {doneCount === steps.length ? "Tudo pronto. O Teto já está trabalhando para você." : `${doneCount} de ${steps.length} passos feitos.`}
      </p>
      <ol className="mt-3 divide-y divide-sep overflow-hidden rounded-card bg-card">
        {steps.map((s) => {
          const Icon = s.done ? CheckCircle : Circle;
          return (
            <li key={s.title}>
              <Link href={s.href} className="pressable hoverable flex items-start gap-3.5 px-5 py-4">
                <Icon size={26} weight={s.done ? "fill" : "regular"} className={`mt-0.5 shrink-0 ${s.done ? "text-ok" : "text-label-2"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="t-row block">
                    {s.title}
                    <span className="sr-only">{s.done ? " (feito)" : " (a fazer)"}</span>
                  </span>
                  <span className="t-sub mt-0.5 block text-label-2">{s.text}</span>
                  <span className="mt-1.5 block text-[0.9375rem] font-semibold">{s.cta}</span>
                </span>
                <CaretRight size={17} weight="bold" className="mt-1 shrink-0 text-label-2" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
