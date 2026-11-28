/** Endereço público do app. O site só aponta para ele; não importa nada do código do app. */
export const APP_URL = "https://teto-omega.vercel.app/";

export const SITE_DESCRIPTION =
  "O Teto soma o que o MEI fatura, mostra quanto ainda cabe no limite anual e avisa antes de passar dele. Projeto do Hack Brasil 2026.";

/** Repositório público do projeto (licença MIT). */
export const REPO_URL = "https://github.com/miguelquintanilhapy/teto";

/** Seções da página, na ordem: atalhos do cabeçalho e do rodapé. */
export const SECTIONS = [
  { id: "recursos", label: "Demonstração" },
  { id: "problema", label: "O problema" },
  { id: "como-usar", label: "Como usar" },
  { id: "para-quem", label: "Para quem" },
  { id: "quem-somos", label: "Quem somos" },
] as const;
