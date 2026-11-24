import { Suspense } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { SheetShell } from "@/components/send/sheet-shell";
import { formatCnpjInput } from "@/lib/format";
import { getEnv } from "@/server/env";
import { loadPanelSafe } from "@/server/panel-safe";

export const metadata = { title: "Editar perfil · Teto" };

export default function EditarPerfilPage() {
  return (
    <SheetShell title="Editar perfil" closeHref="/perfil">
      <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Conteudo />
      </Suspense>
    </SheetShell>
  );
}

async function Conteudo() {
  // Em produção, mudar um cadastro existente fica desativado por padrão: nem os dados vão para a tela.
  if (!getEnv().allowProfileEdit) {
    return (
      <p role="status" className="t-body rounded-card bg-card p-5">
        O cadastro está protegido contra alterações nesta versão do app.
      </p>
    );
  }
  const r = await loadPanelSafe("editar-perfil");
  if (!r.ok) {
    return (
      <p role="alert" className="t-body rounded-card bg-card p-5">
        {r.reason === "no_profile" ? "Ainda não há cadastro. Comece pelo cadastro do MEI." : "Não foi possível carregar o perfil. Tente de novo em instantes."}
      </p>
    );
  }
  const { profile, today } = r.panel;
  return (
    <ProfileForm
      mode="edit"
      today={today}
      initial={{ name: profile.name, taxId: formatCnpjInput(profile.taxId), openingDate: profile.openingDate, email: profile.email }}
    />
  );
}
