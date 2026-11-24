import { describe, expect, it } from "vitest";
import {
  applyPrivacy,
  applyTheme,
  parsePrivacy,
  parseTheme,
  PREFS_SCRIPT,
  PRIVACY_KEY,
  THEME_KEY,
  themeColorFor,
  type RootLike,
} from "./prefs";

const root = (): RootLike => ({ dataset: {} });

describe("tema", () => {
  it("só aceita claro e escuro; qualquer outra coisa segue o sistema", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("roxo")).toBe("system");
    expect(parseTheme(null)).toBe("system");
  });

  it("aplica e remove a escolha no <html>", () => {
    const r = root();
    applyTheme(r, "dark");
    expect(r.dataset.theme).toBe("dark");
    applyTheme(r, "system");
    expect(r.dataset.theme).toBeUndefined();
  });

  it("escolhe a cor da barra do navegador", () => {
    expect(themeColorFor("dark")).toBe("#000000");
    expect(themeColorFor("light")).toBe("#f2f2f7");
    expect(themeColorFor("system")).toBeNull();
  });
});

describe("privacidade", () => {
  it("liga e desliga o atributo", () => {
    const r = root();
    applyPrivacy(r, true);
    expect(r.dataset.privacy).toBe("on");
    applyPrivacy(r, false);
    expect(r.dataset.privacy).toBeUndefined();
    expect(parsePrivacy("on")).toBe(true);
    expect(parsePrivacy("off")).toBe(false);
  });
});

describe("script de preferências antes da pintura", () => {
  const run = (stored: Record<string, string>, broken = false) => {
    const el: RootLike = root();
    const localStorage = {
      getItem: (k: string) => {
        if (broken) throw new Error("bloqueado");
        return stored[k] ?? null;
      },
    };
    new Function("document", "localStorage", PREFS_SCRIPT)({ documentElement: el }, localStorage);
    return el;
  };

  it("aplica o tema e a privacidade guardados", () => {
    const el = run({ [THEME_KEY]: "dark", [PRIVACY_KEY]: "on" });
    expect(el.dataset.theme).toBe("dark");
    expect(el.dataset.privacy).toBe("on");
  });

  it("ignora valores desconhecidos e não quebra se o armazenamento estiver bloqueado", () => {
    expect(run({ [THEME_KEY]: "roxo" }).dataset.theme).toBeUndefined();
    expect(() => run({}, true)).not.toThrow();
  });
});
