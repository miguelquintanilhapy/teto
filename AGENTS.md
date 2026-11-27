# Teto: guia para agentes de IA e para quem chega no projeto

Teto é um app web mobile-first que mostra a um MEI quanto falta para o limite anual de faturamento
(Hack Brasil 2026, trilha Pagamentos & finanças; envio até 30/11/2026 às 23h59). **A IA só lê o documento;
quem decide é código.** Responda e escreva textos de interface e documentação em **português do Brasil**.

## Leia antes de mexer

1. [README.md](README.md): como rodar, variáveis de ambiente, API, comandos, estado atual.
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): camadas, fluxos e decisões.
3. [docs/INTERFACE.md](docs/INTERFACE.md): telas, cores (cada cor tem um papel), acessibilidade, navegação.
4. [docs/SEGURANCA.md](docs/SEGURANCA.md): o que um estranho consegue fazer, defesas e o que falta.
5. [docs/PLANO.md](docs/PLANO.md): prazo e pendências. **[docs/TAREFAS.md](docs/TAREFAS.md): as tarefas da equipe,
   com critério de pronto. Pegue uma e não saia do escopo dela.**

Conforme o que você vai mexer:

- **IA, prompt ou eval:** [docs/AI-ENGINEERING.md](docs/AI-ENGINEERING.md) (cadeia de modelos, roteador, medições).
- **Banco:** [docs/DATA-MODEL.md](docs/DATA-MODEL.md) (tabelas, restrições, o que é reservado).
- **Regra do MEI** (limite, tolerância, DAS): [docs/mei-rules.md](docs/mei-rules.md) (fontes e o que segue em aberto).

## Comandos

```bash
npm run check      # lint + tipos + testes: tem que passar antes de qualquer PR
npm run dev        # http://localhost:3000
npm run build && npm start   # o que a Vercel roda; várias telas são pré-renderizadas, então refaça o build
npm run eval -- --no-write   # avaliação da extração repetindo respostas gravadas (sem rede, sem chave)
```

A CI roda o `check` **e** o eval em replay com limiares (`--min-correct 0.75 --max-silent-wrong 0.10`); um PR que
derruba a qualidade da extração reprova. `npm run eval` **sem** `--no-write` reescreve `docs/EVAL-RESULTS.md`:
não commite essa mudança sem querer.

## Regras que não se negociam

- **`src/core` é puro**: sem I/O, sem relógio, sem rede. Todo efeito entra por portas (interfaces).
  Regra de negócio nunca vai em rota nem em componente.
- **Dinheiro em centavos inteiros.** Datas ISO; "hoje" é calculado na borda, em `America/Sao_Paulo`.
- **Só receita `confirmada` conta no limite.** A IA propõe; o usuário confere; o código decide a direção
  (receita ou despesa) pelo CNPJ do MEI. Não faça a IA decidir isso.
- **Nunca** commite `.env.local`, chave ou segredo. **Nunca** peça nem cole chave em chat, issue, PR ou print.
  Cada pessoa usa a sua (README, passo 3) ou recebe por um canal seguro.
- **Só dados fictícios** em testes, avaliação, demo e capturas de tela. Os planos gratuitos de IA podem usar o
  que enviamos para treinar.
- Mudou o prompt ou o schema da IA? Suba `PROMPT_VERSION` (`src/server/extraction/prompt.ts`) e **regrave o eval**
  (`npm run eval:record`, usa a cota gratuita). As gravações antigas deixam de valer.
- Mudou o banco? Crie uma migração nova em `supabase/migrations/` (a `0001` e a `0002` já estão aplicadas no
  projeto; **quem aplica é o dono do banco**) e atualize `docs/DATA-MODEL.md`.

## Como contribuir (git)

- Branch curta a partir da `main`: `feat/seu-nome-assunto`. Pull request para a `main`; a CI precisa passar.
  Merge sem squash. **Não faça push direto na `main` nem `--force`.**
- Mensagens no formato `feat:`, `fix:`, `docs:`, `test:`, `chore:`, em português, dizendo o porquê.
- Commite **com o nome e o e-mail da própria pessoa** (`git config user.name` e `user.email`, o e-mail da conta do
  GitHub). O regulamento pede commits dos três integrantes: **não use co-autoria falsa nem commite no nome de
  outra pessoa**.
- Antes do PR: `npm run check` verde, e atualize os docs que a sua mudança afeta.

## Convenções de código e interface

- Next.js 16 com `cacheComponents` (veja o bloco abaixo): `"use cache"` + `cacheTag`/`cacheLife`,
  `revalidateTag(tag, { expire: 0 })`, `error.tsx` usa `retry()`, `params` e `searchParams` são assíncronos.
  O painel vem de `getPanel` (`src/server/panel-cache.ts`) e é invalidado quando um lançamento é confirmado.
  As telas leem por `loadPanelSafe` (`src/server/panel-safe.ts`), que não deixa a tela quebrar se o banco falhar.
- Tailwind v4 com tokens de cor em `src/app/globals.css`. **Não escreva cor solta**: use `bg-primary`,
  `text-action`, `text-warn-text`, `text-alert-text`, `text-danger-text`, etc. (azul = o que se toca; `warn` âmbar,
  `alert` laranja-avermelhado e `danger` vermelho = risco; `ok` verde = confirmação; `tax` azul-petróleo = categoria
  do DAS, só no quadradinho do ícone, o `IconTile`). O risco nunca vem só em cor: sempre com ícone e texto.
  Botão secundário: fundo de cartão com `text-action`. A mãozinha e o hover leve vêm de uma regra global em
  `globals.css`; não precisa repetir por componente.
- Valores em dinheiro na tela levam a classe `sensitive` (é o que "Ocultar valores" esconde). Desenho que revela o
  valor (a sala, o preenchimento das barras) leva `privacy-hide`.
- Reais inteiros na tela são **truncados**, nunca arredondados (`src/lib/format.ts`): o mesmo valor não pode
  aparecer como 56.180 num lugar e 56.181 em outro.
  O percentual do limite também é truncado: arredondado, 89,5% aparecia como "90%" com a faixa ainda em "Atenção".
- Lógica pura de interface vai em `src/lib` (com teste ao lado); componentes em `src/components`; telas em `src/app`.
- Textos de erro são específicos e dizem o que fazer; nada de "inválido" genérico.
- Estado de tela com Next: a tela anterior fica guardada escondida **com o estado**. O fluxo de envio se
  reinicia ao sair (`SendFlow`); lembre disso em qualquer formulário novo.
- Windows: os arquivos têm fim de linha misto. Ao editar por script, preserve o que o arquivo já usa.

## Armadilhas conhecidas

- `npm run dev` e produção se comportam diferente (a tela de Perfil, por exemplo, é pré-renderizada).
- O lápis de "Editar perfil" só aparece em produção com `ALLOW_PROFILE_EDIT=true` (o app não tem login).
- O Gemini às vezes responde 503 "alta demanda"; a cadeia cai para o próximo modelo, e isso não é bug nosso.
- As cotas gratuitas acabam no meio do dia: o OpenRouter tem limite diário por conta para os modelos `:free`, e o
  `gemini-3.6-flash` lê poucas notas por dia. `check:ai` e `eval:record` gastam essa cota.
- Abas (Painel, Simular, Histórico, Mais) ficam em `src/app/(app)/`; as outras telas são folhas com X, que volta à
  tela de origem (`NavMemory` + `CloseButton`, em `src/components/nav`). Tela nova: decida se é aba ou folha.
- A interface **não tem testes automatizados** (só a lógica). Verifique no navegador, em 375 px e em 1440 px (no
  computador a barra de abas vira lateral e as telas ocupam a largura; ver `docs/INTERFACE.md`), nos temas claro e escuro.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
