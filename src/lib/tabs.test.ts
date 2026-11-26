import { describe, expect, it } from "vitest";
import { activeTabIndex } from "./tabs";

const HREFS = ["/", "/simular", "/historico", "/perfil"];

describe("activeTabIndex", () => {
  it("acha a aba pelo caminho", () => {
    expect(activeTabIndex("/", HREFS)).toBe(0);
    expect(activeTabIndex("/simular", HREFS)).toBe(1);
    expect(activeTabIndex("/perfil", HREFS)).toBe(3);
  });

  it("as telas de dentro ficam na aba de origem", () => {
    expect(activeTabIndex("/historico/abc", HREFS)).toBe(2);
  });

  it("o Painel só vale no caminho exato, e um prefixo parecido não conta", () => {
    expect(activeTabIndex("/enviar", HREFS)).toBe(-1);
    expect(activeTabIndex("/simulador", HREFS)).toBe(-1);
  });
});
