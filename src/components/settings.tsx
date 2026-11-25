import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

/** O quadradinho com o ícone, o mesmo do Painel: cada linha de configuração ganha um. */
export function SettingsTile({ icon: IconComponent }: { icon: Icon }) {
  return (
    <span className="grid size-[1.875rem] shrink-0 place-items-center rounded-lg bg-tile text-label">
      <IconComponent size={19} weight="fill" aria-hidden="true" />
    </span>
  );
}

/** Um grupo de linhas num cartão só, com título e linhas separadas por filetes. */
export function SettingsGroup({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-5 text-[0.9375rem] font-semibold text-label-2">{title}</h2>
      <div className="divide-y divide-sep overflow-hidden rounded-card bg-card">{children}</div>
      {note && <p className="t-sub mt-2 px-5 text-label-2">{note}</p>}
    </section>
  );
}

/** Linha que leva a outra tela: ícone, título, uma frase e a seta. */
export function SettingsLink({ href, icon, title, hint }: { href: string; icon: Icon; title: string; hint?: string }) {
  return (
    <Link href={href} className="pressable hoverable flex min-h-14 items-center gap-3.5 px-5 py-3">
      <SettingsTile icon={icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-[1.0625rem] font-medium">{title}</span>
        {hint && <span className="t-sub block text-label-2">{hint}</span>}
      </span>
      <CaretRight size={17} weight="bold" className="shrink-0 text-label-2" aria-hidden="true" />
    </Link>
  );
}
