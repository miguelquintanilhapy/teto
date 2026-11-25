import { TabBar } from "@/components/tab-bar";

/** Casca das telas principais: coluna de celular centralizada e a barra de abas flutuante. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] px-4 pt-[calc(env(safe-area-inset-top,0px)_+_1rem)] pb-36">
      {children}
      <TabBar />
    </div>
  );
}
