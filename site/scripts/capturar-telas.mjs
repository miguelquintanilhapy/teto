// Captura telas reais do app publicado, emulando um iPhone (390 x 844 a 3x), para os mockups do site.
// Usa o Microsoft Edge (ou o Chrome) instalado, pelo DevTools Protocol. Sem dependências.
//
// Uso (dentro de site/): npm run capturas [-- url-do-app]
// Saída: site/src/assets/telas/<nome>.webp (importadas pelo next/image)
//
// Os dados da demonstração são fictícios ("Doces da Marta MEI"). Não aponte para um perfil real.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = process.argv[2] ?? "https://teto-omega.vercel.app";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "assets", "telas");

const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

// Digita no campo do Simular (o campo trabalha em centavos: 1200000 = R$ 12.000,00).
const typeValue = (cents) =>
  `(() => { const i = document.querySelector('input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;` +
  ` i.focus(); set.call(i, '${cents}'); i.dispatchEvent(new Event('input', { bubbles: true })); i.blur(); })()`;

const JOBS = [
  { name: "painel-escuro", path: "/", theme: "dark" },
  { name: "painel-claro", path: "/", theme: "light" },
  { name: "painel-previsao-escuro", path: "/", theme: "dark", eval: "window.scrollTo(0, 620)" },
  { name: "painel-mensal-claro", path: "/", theme: "light", eval: "window.scrollTo(0, document.body.scrollHeight)" },
  { name: "simular-escuro", path: "/simular", theme: "dark", eval: typeValue(1200000) },
  { name: "simular-claro", path: "/simular", theme: "light", eval: typeValue(500000) },
  { name: "enviar-escuro", path: "/enviar", theme: "dark" },
  { name: "historico-claro", path: "/historico", theme: "light" },
  { name: "regras-claro", path: "/regras", theme: "light", eval: "window.scrollTo(0, 360)" },
  // A tela de avisos fica de fora: mostra parte do e-mail cadastrado.
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Em pontos, como num iPhone de 390 x 844. Se mudar, mude também em src/components/phone.tsx.
const SAFE_TOP = 47;
const SAFE_BOTTOM = 34;

const browser = BROWSERS.find((b) => existsSync(b));
if (!browser) {
  console.error("Não achei o Edge nem o Chrome. Edite a lista BROWSERS com o caminho do seu navegador.");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const port = 9333;
const profile = join(tmpdir(), `teto-capturas-${Date.now()}`);
const proc = spawn(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });

try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(300);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target = list.find((t) => t.type === "page");
    } catch {
      // o navegador ainda está abrindo
    }
  }
  if (!target) throw new Error("O navegador não abriu a porta de depuração.");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id;
      pending.set(i, resolve);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setUserAgentOverride", {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });

  for (const job of JOBS) {
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    // As áreas seguras de um iPhone (barra de status em cima, traço de início embaixo): o app já se afasta delas,
    // e a moldura do site (src/components/phone.tsx) desenha a hora, a bateria e o traço por cima.
    const insets = await send("Emulation.setSafeAreaInsetsOverride", { insets: { top: SAFE_TOP, bottom: SAFE_BOTTOM, left: 0, right: 0 } });
    if (insets.error) throw new Error(`O navegador não simula a área segura (${insets.error.message}). Atualize o Edge ou o Chrome.`);
    await send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-color-scheme", value: job.theme },
        { name: "prefers-reduced-motion", value: "reduce" },
      ],
    });
    await send("Page.navigate", { url: APP + job.path });
    await sleep(4500);
    if (job.eval) {
      await send("Runtime.evaluate", { expression: job.eval, awaitPromise: true });
      await sleep(1500);
    }
    const shot = await send("Page.captureScreenshot", { format: "webp", quality: 88 });
    writeFileSync(join(OUT, `${job.name}.webp`), Buffer.from(shot.result.data, "base64"));
    console.log("ok", job.name);
  }
  ws.close();
} finally {
  proc.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
