/**
 * Qual aba está ativa para um caminho. O Painel ("/") só vale no caminho exato; as outras valem também nas
 * telas de dentro ("/historico/123" é a aba Histórico). Devolve -1 fora das abas (o envio, por exemplo).
 */
export function activeTabIndex(pathname: string, hrefs: ReadonlyArray<string>): number {
  return hrefs.findIndex((href) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)));
}
