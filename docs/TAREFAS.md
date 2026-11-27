# Tarefas da equipe até o envio

Prazo: **30/11/2026, 23h59** (o repositório congela). Meta real: fechar em 29/11.
Regras gerais de contribuição em [AGENTS.md](../AGENTS.md) e no [README](../README.md). Estado do projeto em
[PLANO.md](PLANO.md) e [AUDITORIA.md](AUDITORIA.md).

**Como pegar uma tarefa:** crie uma branch `feat/seu-nome-assunto` a partir da `main`, faça só o que está no
cartão, rode `npm run check`, abra o PR e peça revisão. Commite **com o seu nome e e-mail do GitHub**.
Nunca coloque chave no repositório, em issue ou em chat. Só dados fictícios.

## A. Qualidade e publicação (Pessoa 2)

### A1. CI com `npm audit` e `gitleaks`
- **Feito** no PR #13 (job `check` com `npm audit` e job `secrets` com o `gitleaks`).
- **Por quê:** a CI só roda lint, tipos, testes e o eval em replay; os documentos prometiam varredura de segredos
  e de dependências.
- **Arquivo:** `.github/workflows/ci.yml` (hoje: checkout, Node 24, `npm ci`, lint, typecheck, test, eval).
- **Fazer:** acrescentar um passo `npm audit --omit=dev --audit-level=high` e um job do `gitleaks`
  (`gitleaks/gitleaks-action@v2`, com `fetch-depth: 0` no checkout para varrer o histórico).
- **Pronto quando:** a CI roda verde no PR, e um segredo falso commitado numa branch de teste a faz falhar
  (depois apague a branch). Atualize `docs/SEGURANCA.md`, `docs/AUDITORIA.md` e `docs/ARCHITECTURE.md` §6 (hoje
  dizem "ainda não está na CI").

### A2. `LICENSE` e Dependabot
- **Feito** no PR #13 (`LICENSE` MIT e `.github/dependabot.yml`).
- **Fazer:** criar `LICENSE` (combine a licença com o time; sugestão: MIT; o regulamento só exige que não
  impeça ler, executar e testar o código) e `.github/dependabot.yml` para `npm` e `github-actions`, semanal.
- **Pronto quando:** o GitHub mostra a licença na página do repositório; marque o item em `docs/PLANO.md`
  (Definição de pronto) e em `docs/AUDITORIA.md` ("Pontos bobos").

### A3. Teste em aparelho de verdade
- **Por quê:** o dono do projeto já testou no iPhone (o topo e a área segura foram corrigidos a partir disso), mas
  ninguém testou no **Android** nem com **leitor de tela**.
- **Fazer:** com a demo no ar (ou `npm run build && npm start` e o IP do computador na mesma rede), no **Android
  (Chrome)** e, se der, num segundo iPhone (Safari): enviar uma nota (foto e arquivo), conferir e confirmar;
  lançar sem nota; simular; trocar o tema (a troca deve dissolver, sem piscar); "Ocultar valores"; instalar na
  tela inicial (`/instalar`; no Android deve aparecer o botão de instalar). Passar pelo TalkBack ou VoiceOver no
  Painel e no envio.
- **Pronto quando:** cada problema virou uma issue (título, tela, aparelho, passos, captura **sem dado real**) e
  os pequenos foram corrigidos em PRs. Resumo em `docs/REVISAO.md`, numa rodada nova.

### A4. (se sobrar tempo) Testes de interface com Playwright
- **Fazer:** arquivos novos em `e2e/` e um script `npm run e2e`, cobrindo: abrir o Painel, simular uma venda,
  lançar sem nota e conferir que o painel muda, e sair de uma nota e voltar (a tela deve recomeçar do zero).
- **Cuidado:** o envio de nota real gasta cota de IA; nos testes, intercepte `/api/documents`.
- **Pronto quando:** `npm run e2e` passa localmente e está documentado no README. Não é obrigatório rodar na CI.

## B. IA e avaliação (Pessoa 3)

> **Atualização (25/11):** a cadeia de modelos foi trocada (`gemini-3.5-flash-lite` → Nemotron →
> `gemini-flash-lite-latest` → `gemini-3.6-flash`) e o roteador ganhou segundo modelo em paralelo e "último recurso".
> O prompt está na **v4** (instrução própria para a chave de acesso), e a chave que não passa no dígito verificador
> agora é **descartada** (a nota segue, com aviso), em vez de reprovar a nota. No v4 só os dois Gemini "lite" estão
> gravados (26 de 26 cada). Leia `docs/AI-ENGINEERING.md` antes de começar. As tarefas abaixo já partem daí.

### B1. Gravar o Nemotron e o `gemini-3.6-flash` no v4, e repetir as gravações em outro horário
- **Por quê:** no v4, o Nemotron e o `3.6-flash` estão com 0 de 26: a cota diária gratuita do OpenRouter acabou
  durante os testes de 25/11, e a do `3.6-flash` é de poucas leituras por dia. Além disso, cada resposta foi gravada
  **uma vez**, num único dia, e os modelos não são determinísticos.
- **Fazer:** com a **sua** chave no `.env.local` (README, passo 3) e com a cota do dia ainda intacta,
  `npm run check:ai` e depois `npm run eval:record -- --all --refresh --only nemotron` e
  `npm run eval:record -- --all --refresh --only 3.6-flash` (e, se der, os dois "lite" em outro horário, para ver a
  variação). Se o Gemini devolver 503 ou 429, tente de novo mais tarde.
- **Pronto quando:** as gravações novas estão em `fixtures/eval/recordings/`, `npm run eval` reproduz o
  resultado sem rede, e `docs/EVAL-RESULTS.md` e a tabela "Qualidade da extração" do README foram atualizados
  **com o que foi medido**, inclusive se piorou.

### B2. Ampliar o conjunto de notas
- **Fazer:** em `scripts/generate-fixtures.mts`, criar casos novos: NFS-e de outras prefeituras (layouts
  diferentes), recibo amassado, foto torta ou cortada, nota com valor por extenso, nota de despesa. Atualizar o
  gabarito (`fixtures/eval/cases.json`) e rodar `npm run fixtures:generate`. Dados 100% fictícios.
- **Foco sugerido:** casos que o conjunto ainda não cobre. A chave de acesso já melhorou com o prompt v4 (96% no
  eval), mas o conjunto tem poucas notas com chave: variar a fonte, o tamanho e a qualidade da imagem.
- **Cuidado:** os nomes das etiquetas e o gabarito alimentam a tabela "Por tipo de caso" do relatório.
- **Pronto quando:** os casos novos estão no eval, gravados, e o que errou foi anotado em `docs/AI-ENGINEERING.md`
  (o `docs/EVAL-RESULTS.md` é gerado: não edite à mão).

### B3. Melhorar a leitura de chave de acesso e CNPJ
- **Onde estamos:** o prompt v4 já tem instrução própria para a chave (11 grupos de 4 dígitos, conferir AAMM e
  CNPJ): na bancada, a chave exata subiu de 6/15 para 12/15. A chave inválida **não reprova mais** a nota (é
  descartada, com aviso); um CPF/CNPJ inválido continua reprovando, porque decide receita ou despesa. Resolução alta
  e temperatura 0 foram testadas e não ajudaram.
- **Fazer:** focar no que ainda erra. Nas gravações v4 dos dois Gemini "lite", a `nfe-01` sai igual nos dois, com 45 dígitos (um
  "1" a mais por volta da posição 35, que desloca o fim da chave); investigar se é a imagem ou o modelo. Testar o Nemotron e o `3.6-flash` na chave quando houver cota (são a segunda opinião da cadeia).
  Para o CNPJ, medir se uma instrução parecida (conferir o dígito verificador) ajuda.
- **Cuidado:** mudou o prompt ou o schema? Suba `PROMPT_VERSION` e **regrave tudo** (B1 de novo).
- **Pronto quando:** há uma proposta medida (antes e depois, no mesmo conjunto) num PR ou numa issue, com a
  decisão registrada em `docs/AI-ENGINEERING.md`.

## C. Entrega (qualquer um, combinar quem)

- **Vídeo de até 3 minutos**, aberto sem login, mostrando o produto funcionando (roteiro em
  [PLANO.md](PLANO.md)). Antes de gravar: `npm run seed:demo -- --reset` e `npm run seed:demo`.
- **Link da demo no README** e **painel do hackathon** (nome, frase, descrição, trilha).
- **Não gaste a cota de IA no dia da gravação** (nada de `check:ai` nem `eval:record`).
- **Quem mexe no que é do dono do projeto:** aplicar migração no banco, desligar a proteção por login da
  Vercel, conferir as variáveis da Vercel (inclusive o `MODEL_CHAIN`) e mesclar o PR com os ajustes de interface da
  `feat/chave-e-latencia` (os PRs #21 e #22 já foram mesclados; falta o que veio depois do #22).
  Não faça isso sem combinar.
