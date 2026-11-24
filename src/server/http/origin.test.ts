import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./origin";

const req = (headers: Record<string, string>) => new Request("https://teto.vercel.app/api/x", { method: "POST", headers });

describe("isSameOrigin", () => {
  it("aceita a própria origem", () => {
    expect(isSameOrigin(req({ origin: "https://teto.vercel.app", host: "teto.vercel.app" }))).toBe(true);
  });

  it("aceita quem não manda Origin (curl, servidor, cron)", () => {
    expect(isSameOrigin(req({ host: "teto.vercel.app" }))).toBe(true);
  });

  it("recusa outro site, subdomínio parecido e origem nula", () => {
    expect(isSameOrigin(req({ origin: "https://evil.example", host: "teto.vercel.app" }))).toBe(false);
    expect(isSameOrigin(req({ origin: "https://teto.vercel.app.evil.example", host: "teto.vercel.app" }))).toBe(false);
    expect(isSameOrigin(req({ origin: "null", host: "teto.vercel.app" }))).toBe(false);
    expect(isSameOrigin(req({ origin: "não é url", host: "teto.vercel.app" }))).toBe(false);
  });

  it("usa o host repassado pelo proxy quando existe", () => {
    expect(isSameOrigin(req({ origin: "https://teto.vercel.app", host: "interno:3000", "x-forwarded-host": "teto.vercel.app" }))).toBe(true);
  });

  it("diferencia a porta", () => {
    expect(isSameOrigin(req({ origin: "http://localhost:3001", host: "localhost:3000" }))).toBe(false);
  });
});
