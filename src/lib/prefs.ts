/** Preferências do usuário guardadas no aparelho (nada disso vai ao servidor). */
export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "teto-theme";
export const PRIVACY_KEY = "teto-privacy";

export const parseTheme = (v: string | null | undefined): Theme => (v === "light" || v === "dark" ? v : "system");
export const parsePrivacy = (v: string | null | undefined): boolean => v === "on";

/**
 * Roda antes da primeira pintura, para a tela não piscar no tema errado.
 * É texto puro (vai dentro de um <script>), por isso fica aqui e é testado.
 */
export const PREFS_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){d.dataset.theme=t;var c=t==="dark"?"#000000":"#f2f2f7",f=function(){var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].setAttribute("content",c)};f();document.addEventListener("DOMContentLoaded",f)}if(localStorage.getItem("${PRIVACY_KEY}")==="on")d.dataset.privacy="on"}catch(e){}try{if(sessionStorage.getItem("teto:seen"))d.dataset.seen="1";else{sessionStorage.setItem("teto:seen","1");setTimeout(function(){d.dataset.seen="1"},1500)}}catch(e){}})()`;

export interface RootLike {
  dataset: Record<string, string | undefined>;
}

/** Aplica o tema ao <html>. "system" remove a escolha e volta a seguir o sistema. */
export function applyTheme(root: RootLike, theme: Theme): void {
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export function applyPrivacy(root: RootLike, on: boolean): void {
  if (on) root.dataset.privacy = "on";
  else delete root.dataset.privacy;
}

/** Cor da barra do navegador para o tema escolhido (null = deixa o sistema decidir). */
export function themeColorFor(theme: Theme): string | null {
  return theme === "light" ? "#f2f2f7" : theme === "dark" ? "#000000" : null;
}
