import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { SheetShell } from "@/components/send/sheet-shell";
import { todayInSaoPaulo } from "@/server/clock";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Bem-vindo · Teto" };

export default function BemVindoPage() {
  return (
    <SheetShell title="Bem-vindo">
      <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Conteudo />
      </Suspense>
    </SheetShell>
  );
}

async function Conteudo() {
  const r = await loadPanelSafe("bem-vindo");
  // Quem já tem cadastro vai direto ao painel.
  if (r.ok) redirect("/");
  if (r.reason === "error") {
    return (
      <p role="alert" className="t-body rounded-card bg-card p-5">
        Não foi possível carregar agora. Tente de novo em instantes.
      </p>
    );
  }
  return (
    <>
      <section className="mb-5 px-1">
        <h2 className="t-large-title">Cadastre seu MEI</h2>
        <p className="t-body mt-2 text-label-2">
          Com o CNPJ e a data de abertura, o Teto calcula o seu limite e avisa antes de você estourar.
        </p>
      </section>
      <ProfileForm mode="create" today={todayInSaoPaulo(new Date())} initial={{ name: "", taxId: "", openingDate: "", email: "" }} />
    </>
  );
}
