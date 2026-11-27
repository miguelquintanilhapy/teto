import { TabBar } from "@/components/tab-bar";
import { TabContent } from "@/components/tab-content";

/**
 * Casca das telas principais: coluna de celular centralizada e a barra de abas flutuante.
 * No computador (`lg`), a barra vira lateral e o conteúdo ocupa o resto da largura (até 1400 px).
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app-column app-tabs mx-auto min-h-dvh w-full max-w-[430px] px-4 pt-[calc(env(safe-area-inset-top,0px)_+_1rem)] pb-36 lg:max-w-none lg:pt-9 lg:pr-12 lg:pb-14 lg:pl-[304px]">
      <div className="lg:mx-auto lg:max-w-[1400px]">
        <TabContent>{children}</TabContent>
      </div>
      <TabBar />
    </div>
  );
}
