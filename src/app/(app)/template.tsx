/** O template refaz a montagem a cada navegação, então a entrada suave acontece em toda troca de aba. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
