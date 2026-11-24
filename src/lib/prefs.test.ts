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
    const metas = [{ content: "#f2f2f7", setAttribute(_k: string, v: string) { this.content = v; } }];
    const localStorage = {
      getItem: (k: string) => {
        if (broken) throw new Error("bloqueado");
        return stored[k] ?? null;
      },
    };
    const doc = { documentElement: el, querySelectorAll: () => metas, addEventListener: () => undefined };
    new Function("document", "localStorage", PREFS_SCRIPT)(doc, localStorage);
    (el as RootLike & { metas?: typeof metas }).metas = metas;
    return el as RootLike & { metas: typeof metas };
  };

  it("aplica o tema e a privacidade guardados", () => {
    const el = run({ [THEME_KEY]: "dark", [PRIVACY_KEY]: "on" });
    expect(el.dataset.theme).toBe("dark");
    expect(el.dataset.privacy).toBe("on");
  });

  it("ajusta a cor da barra do navegador ao tema escolhido", () => {
    expect(run({ [THEME_KEY]: "dark" }).metas[0]!.content).toBe("#000000");
    expect(run({ [THEME_KEY]: "light" }).metas[0]!.content).toBe("#f2f2f7");
    expect(run({}).metas[0]!.content).toBe("#f2f2f7"); // sem escolha, deixa como o sistema definiu
  });

  it("ignora valores desconhecidos e não quebra se o armazenamento estiver bloqueado", () => {
    expect(run({ [THEME_KEY]: "roxo" }).dataset.theme).toBeUndefined();
    expect(() => run({}, true)).not.toThrow();
  });
});
