/**
 * Troca de tema com o fundido do iPhone: a tela inteira se dissolve de uma aparência para a outra
 * (cerca de 0,4 s), em vez de piscar. Usa a View Transitions API, que tira uma "foto" da tela antes e
 * dissolve para a nova. Sem ela (Firefox, Safari antigo), um fundido por CSS nas cores faz o mesmo papel.
 * Com "reduzir movimento" ligado, a troca é instantânea.
 */
export const THEME_FADE_MS = 400;

interface ViewTransitionDocument {
  startViewTransition?: (update: () => void) => unknown;
}

export function withThemeTransition(apply: () => void): void {
  let reduce = false;
  try {
    reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    /* sem matchMedia: segue com a animação */
  }
  if (reduce) {
    apply();
    return;
  }

  const doc = document as Document & ViewTransitionDocument;
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(apply);
    return;
  }

  const root = document.documentElement;
  root.classList.add("theme-fade");
  apply();
  window.setTimeout(() => root.classList.remove("theme-fade"), THEME_FADE_MS + 100);
}
