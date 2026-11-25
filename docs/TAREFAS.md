# Tarefas da equipe até o envio

Prazo: **30/11/2026, 23h59** (o repositório congela). Meta real: fechar em 29/11.
Regras gerais de contribuição em [AGENTS.md](../AGENTS.md) e no [README](../README.md). Estado do projeto em
[PLANO.md](PLANO.md) e [AUDITORIA.md](AUDITORIA.md).

**Como pegar uma tarefa:** crie uma branch `feat/seu-nome-assunto` a partir da `main`, faça só o que está no
cartão, rode `npm run check`, abra o PR e peça revisão. Commite **com o seu nome e e-mail do GitHub**.
Nunca coloque chave no repositório, em issue ou em chat. Só dados fictícios.

## A. Qualidade e publicação (Pessoa 2)

### A1. CI com `npm audit` e `gitleaks`
- **Por quê:** a CI só roda lint, tipos, testes e o eval em replay; os documentos prometiam varredura de segredos
  e de dependências.
- **Arquivo:** `.github/workflows/ci.yml` (hoje: checkout, Node 24, `npm ci`, lint, typecheck, test, eval).
- **Fazer:** acrescentar um passo `npm audit --omit=dev --audit-level=high` e um job do `gitleaks`
  (`gitleaks/gitleaks-action@v2`, com `fetch-depth: 0` no checkout para varrer o histórico).
- **Pronto quando:** a CI roda verde no PR, e um segredo falso commitado numa branch de teste a faz falhar
  (depois apague a branch). Atualize `docs/SEGURANCA.md`, `docs/AUDITORIA.md` e `docs/ARCHITECTURE.md` §6 (hoje
  dizem "ainda não está na CI").

### A2. `LICENSE` e Dependabot
- **Fazer:** criar `LICENSE` (combine a licença com o time; sugestão: MIT; o regulamento só exige que não
  impeça ler, executar e testar o código) e `.github/dependabot.yml` para `npm` e `github-actions`, semanal.
- **Pronto quando:** o GitHub mostra a licença na página do repositório; marque o item em `docs/PLANO.md`
  (Definição de pronto) e em `docs/AUDITORIA.md` ("Pontos bobos").

### A3. Teste em aparelho de verdade
- **Por quê:** a interface foi verificada só no navegador de computador, em 375 px. Não houve teste em celular
  nem com leitor de tela.
- **Fazer:** com a demo no ar (ou `npm run build && npm start` e o IP do computador na mesma rede), no **iPhone
  (Safari)** e no **Android (Chrome)**: enviar uma nota (foto e arquivo), conferir e confirmar; lançar sem nota;
  simular; trocar o tema (a troca deve dissolver, sem piscar); "Ocultar valores"; instalar na tela inicial
  (`/instalar`). Se der, passar pelo VoiceOver ou TalkBack no Painel.
- **Pronto quando:** cada problema virou uma issue (título, tela, aparelho, passos, captura **sem dado real**) e
  os pequenos foram corrigidos em PRs. Resumo em `docs/REVISAO.md`, numa rodada nova.

### A4. (se sobrar tempo) Testes de interface com Playwright
- **Fazer:** arquivos novos em `e2e/` e um script `npm run e2e`, cobrindo: abrir o Painel, simular uma venda,
  lançar sem nota e conferir que o painel muda, e sair de uma nota e voltar (a tela deve recomeçar do zero).
- **Cuidado:** o envio de nota real gasta cota de IA; nos testes, intercepte `/api/documents`.
- **Pronto quando:** `npm run e2e` passa localmente e está documentado no README. Não é obrigatório rodar na CI.

## B. IA e avaliação (Pessoa 3)

### B1. Completar as gravações do eval
- **Por quê:** hoje as gravações são parciais: Flash-Lite 12/26, Nemotron 14/26, Flash 0/26. Os números do README
  vêm delas, então precisam ser completos para valerem.
- **Fazer:** com a **sua** chave no `.env.local` (README, passo 3), `npm run check:ai` e depois
  `npm run eval:record`. Se o Gemini devolver 503 ("alta demanda"), tente em outro horário.
- **Pronto quando:** as gravações em `fixtures/eval/recordings/` estão completas, `npm run eval` reproduz o
  resultado sem rede, e `docs/EVAL-RESULTS.md` e a tabela "Qualidade da extração" do README foram atualizados
  **com o que foi medido**, inclusive se piorou.

### B2. Ampliar o conjunto de notas
- **Fazer:** em `scripts/generate-fixtures.mts`, criar casos novos: NFS-e de outras prefeituras (layouts
  diferentes), recibo amassado, foto torta ou cortada, nota com valor por extenso, nota de despesa. Atualizar o
  gabarito (`fixtures/eval/cases.json`) e rodar `npm run fixtures:generate`. Dados 100% fictícios.
- **Pronto quando:** os casos novos estão no eval, gravados, e o que errou foi anotado em `docs/EVAL-RESULTS.md`.

### B3. Os 503 do Gemini e a ordem da cadeia
- **Fazer:** olhar os rastros em `/ia` e nas gravações; propor (com número) um ajuste: ordem em `MODEL_CHAIN`,
  tempos em `src/server/extraction/router.ts` (hoje 25 s por tentativa, 40 s no total, cooldown de 180 s para
  "alta demanda") ou prompt.
- **Cuidado:** mudou o prompt ou o schema? Suba `PROMPT_VERSION` e **regrave tudo** (B1 de novo).
- **Pronto quando:** há uma proposta medida (antes e depois) num PR ou numa issue, com a decisão registrada em
  `docs/AI-ENGINEERING.md`.

## C. Entrega (qualquer um, combinar quem)

- **Vídeo de até 3 minutos**, aberto sem login, mostrando o produto funcionando (roteiro em
  [PLANO.md](PLANO.md)). Antes de gravar: `npm run seed:demo -- --reset` e `npm run seed:demo`.
- **Link da demo no README** e **painel do hackathon** (nome, frase, descrição, trilha).
- **Quem mexe no que é do dono do projeto:** aplicar migração no banco, desligar a proteção por login da
  Vercel e mesclar o PR da interface (`feat/interface-painel`). Não faça isso sem combinar.
