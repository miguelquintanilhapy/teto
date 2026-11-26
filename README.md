# Teto

**Saiba quanto falta para o teto do seu MEI, antes de estourar.**

Muitos MEIs não somam o que faturam e só descobrem tarde que passaram do limite
anual, quando o imposto já é retroativo. O Teto lê notas e extratos, organiza a
receita, mostra quanto falta para o limite, projeta quando ele será ultrapassado
e estima quanto o estouro custaria.

Projeto do **Hack Brasil 2026**, trilha **Pagamentos & finanças**.

> Todos os dados de demonstração são sintéticos. O Teto não substitui um contador:
> valores de custo são **estimativas**. Veja [docs/mei-rules.md](docs/mei-rules.md).

## O que faz

- Lê foto ou PDF de notas, recibos e comprovantes de Pix com IA, e **você confere** antes de qualquer valor entrar no limite.
  Fotos grandes são reduzidas no próprio aparelho, sem o usuário precisar saber de megabytes. (XML não é aceito.)
- Quatro abas (Painel, Simular, Histórico e Mais) e o botão "Enviar" ao lado delas.
- Painel: faturamento do ano, faixa de risco (verde, âmbar, laranja-avermelhado, vermelho), a "sala" do limite,
  barra do limite com a faixa de tolerância, previsão de quando o limite será ultrapassado (com a média usada),
  DAS com atalho para gerar a guia e receita por mês.
- Limite proporcional para quem abriu o MEI no meio do ano, e as três faixas (limite, 20% acima, acima disso)
  explicadas na tela de Regras.
- Simulador: "e se eu aceitar uma venda de R$ X?", respondido com um número só (quanto ainda cabe ou quanto a venda
  passa do limite) e uma frase com a consequência, o custo estimado e o atalho "Usar o que ainda cabe".
- Histórico mês a mês, com o resumo do mês, busca (descrição, valor ou CPF/CNPJ) e filtro de receitas e despesas;
  detalhe, correção e cancelamento (tudo registrado) e aviso de possível duplicidade; lançamento sem
  nota e importação do extrato bancário (CSV, lido no navegador) cruzada com as receitas.
- Alertas por e-mail ao cruzar 80%, 90%, 100% e 120% do limite (idempotentes, com cron diário).
- Relatório do ano em CSV (e em PDF pela impressão do navegador), tema claro e escuro, "ocultar valores" e
  instalação na tela inicial do celular.
- Tela "Como a IA lê": em linguagem simples, com modelos, cota do dia, tempos e falhas em "Detalhes técnicos",
  para a IA não ser uma caixa-preta.

Mais detalhes das telas e das decisões de design em [docs/INTERFACE.md](docs/INTERFACE.md).

## Como funciona (resumo)

**A IA propõe, o código dispõe.** O modelo só extrai os campos do documento.
Limites, risco, projeção, alertas e conciliação são código próprio em
`src/core`, puro e testado. A extração passa por uma **cadeia de modelos
gratuitos** de mais de um fornecedor, com failover, escalonamento por qualidade
e validação determinística da resposta.

## Estrutura

```
src/
  core/        regras do MEI: puras, sem I/O, 100% testáveis
  server/      extração com IA (cadeia de provedores), avaliação, alertas, casos de uso e handlers HTTP
  lib/         lógica pura da interface (textos, simulação, histórico, regras, conciliação, relatório, redução de foto)
  components/  componentes da interface
  app/         telas e rotas (Next.js)
public/brand/  logo e ícones
supabase/      migrações do banco
fixtures/      notas sintéticas, gabarito e respostas gravadas dos modelos (eval)
scripts/       verificações de ambiente, gerador de notas, runner do eval e dados de demonstração
docs/          arquitetura, modelo de dados, interface, segurança, regras do MEI, plano
```

## Configuração passo a passo

Siga na ordem. Quem só vai **rodar** o projeto usa o mesmo Supabase do time (passo 4,
opção B). Quem cria o projeto do zero usa a opção A.

### 1. Requisitos

- **Node 24** (`node -v`) e **npm**. Há um `.nvmrc` com a versão.
- **Git**.

### 2. Clonar e instalar

```bash
git clone https://github.com/miguelquintanilhapy/teto.git
cd teto
npm install
```

### 3. Criar o `.env.local`

O arquivo `.env.local` **não vem no repositório** (de propósito: ele guarda chaves).
Crie a partir do modelo:

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env.local
```

```bash
# macOS / Linux
cp .env.example .env.local
```

Preencha cada variável. **Sem aspas e sem espaço antes ou depois do `=`.**

| Variável | De onde vem | Observações |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase: botão **Connect**, ou Settings → Data API | Termina em `.supabase.co`. **Sem `/rest/v1`**. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase: Settings → API Keys → **Publishable key** | Começa com `sb_publishable_`. Pode ficar no navegador. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase: Settings → API Keys → **Secret key** | Começa com `sb_secret_`. **Acesso total ao banco**: só no servidor, nunca no Git. |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Use uma conta **Gmail pessoal**. Contas corporativas (Workspace) costumam bloquear. Não ative cobrança. |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) | Sugestão: expiração de 90 dias e limite de crédito baixo (US$ 0,10). Usamos só modelos `:free`. |
| `MODEL_CHAIN` | Lista fixa do time | **Uma linha só**, sem espaços (veja abaixo). |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys | Para os alertas por e-mail. Vazio = os alertas ficam registrados e saem quando a chave for configurada. |
| `ALERT_FROM` | Opcional | Remetente dos alertas. Padrão `Teto <onboarding@resend.dev>`, que só entrega ao dono da conta Resend. |
| `ALLOW_PROFILE_EDIT` | Opcional | Em produção, editar um cadastro existente é recusado por padrão (não há login). `true` libera. |
| `CRON_SECRET` | Você inventa | **Mínimo de 16 caracteres.** Veja como gerar abaixo. |
| `EXTRACTION_DAILY_QUOTA` | Padrão `200` | Teto diário de extrações com IA, para proteger a cota gratuita. |
| `DEMO_PROFILE_EMAIL` | Opcional | E-mail do perfil de demonstração (recebe os alertas). Só é lido pelo `npm run seed`. |

Valor atual do `MODEL_CHAIN`, em ordem de tentativa. Se o primeiro modelo passa de 7 s sem responder, o
seguinte entra **em paralelo** e o que responder primeiro (e passar na validação) vence:

```
MODEL_CHAIN=gemini:gemini-3.5-flash-lite,openrouter:nvidia/nemotron-3.5-super-vl:free,gemini:gemini-flash-lite-latest,gemini:gemini-3.6-flash
```

Por que esta cadeia (medida em 25/11, ver [docs/AI-ENGINEERING.md](docs/AI-ENGINEERING.md)): os modelos
`gemini-3.1-flash-lite` e `gemini-3.8-flash`, usados antes, davam 503 "alta demanda" em quase todas as
tentativas. O Nemotron (outra infraestrutura) foi o mais estável na bancada, mas o OpenRouter gratuito tem limite
diário por conta; os `lite` são rápidos; o `3.6-flash` acerta bem, mas tem cota diária pequena e fica de reserva.
**Se mudar a cadeia, mude a variável na Vercel também.**

Para gerar um `CRON_SECRET` no PowerShell:

```powershell
-join ((48..57)+(97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

> Se faltar ou estiver errada qualquer variável, o app e os scripts param com a lista
> de **todos** os problemas de uma vez (`Configuração inválida: ...`).

### 4. Banco de dados (Supabase)

**Opção A: você cria o projeto**

1. Em [supabase.com/dashboard](https://supabase.com/dashboard), crie um projeto novo
   (plano Free). Guarde a senha do banco. Prefira a região **South America (São Paulo)**,
   que tem menos latência para usuários no Brasil. (O projeto atual do time está em
   *West US (Oregon)*; para o hackathon isso só soma alguns milissegundos e não precisa mudar.)
2. Abra o **SQL Editor** → **New query**, cole **todo** o arquivo
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) e clique em **Run**.
   **Rode uma vez só**: repetir dá erro de "already exists".
   Depois rode também [`0002_one_transaction_per_document.sql`](supabase/migrations/0002_one_transaction_per_document.sql)
   (o arquivo explica como conferir se já existe documento duplicado antes).
3. Pegue a URL e as chaves (tabela do passo 3).

**Opção B: o projeto já existe (a equipe usa o mesmo)**

1. Peça ao dono do projeto para convidar você: clique no nome da organização no topo do
   Supabase → **Team** → **Invite members** (papel **Developer**).
2. Aceite o convite que chega por e-mail (olhe também o spam) e entre com a sua conta.
3. No projeto `teto`, pegue a URL e as chaves em **Project Settings → API Keys**.
   **Não peça a chave secreta por mensagem.** Se não conseguir ver a *Secret key* ou abrir
   o *SQL Editor*, avise o dono: o papel pode precisar subir para *Administrator*.
4. **Não rode a migração de novo.**

**Criar o perfil de demonstração** (só a opção A; na B o banco já o tem):

```bash
npm run seed
```

**Conferir** (as duas opções):

```bash
npm run check:supabase
npm run check:db
```

O `check:supabase` deve listar as 10 tabelas como `OK`, o bucket `documents` como privado e terminar com
`Tudo certo.` O `check:db` testa a cota, o cooldown, o storage e o perfil no banco real (e apaga o que cria).

**Dados de demonstração** (receitas fictícias de março a outubro, para o painel não ficar vazio):

```bash
npm run seed:demo                 # cria
npm run seed:demo -- --reset      # apaga os lançamentos e recomeça
npm run seed:demo -- --total 60000  # escolhe o faturamento total, em reais
```

### 5. Chaves de IA

```bash
npm run check:ai
```

Faz **uma chamada real por modelo** (gasta 1 requisição da cota gratuita de cada um).
Para testar só um provedor: `npm run check:ai -- gemini`.

### 6. Rodar e validar

```bash
npm run dev     # http://localhost:3000
npm run check   # lint + tipos + testes
npm run eval -- --no-write --min-correct 0.75 --max-silent-wrong 0.10   # o eval como a CI roda (sem rede)
```

A CI roda o `check` e, depois, o eval em replay com esses limiares: se a qualidade da extração cair, o PR
reprova. **`npm run eval` sem `--no-write` reescreve `docs/EVAL-RESULTS.md`**; só commite essa mudança quando
regravar de propósito.

## Publicar na Vercel

1. Importe o repositório na Vercel (framework Next.js, sem configuração extra).
2. Em **Settings → Environment Variables**, cadastre as mesmas variáveis do `.env.local`, **exceto**
   `ALLOW_PROFILE_EDIT` (deixe sem valor: em produção ninguém troca o cadastro existente; veja
   [docs/SEGURANCA.md](docs/SEGURANCA.md)). `CRON_SECRET` é obrigatório: a Vercel o envia no cron.
3. Rode as duas migrações no Supabase (passo 4) antes do primeiro uso.
4. Para o link ficar **público** (o hackathon exige abrir sem login), desligue em
   **Settings → Deployment Protection** a opção *Vercel Authentication*. Com ela ligada, só quem tem conta
   no time abre o endereço.
5. O cron diário dos alertas está em [`vercel.json`](vercel.json) (`0 12 * * *`, 12h UTC).
6. A aba Mais mostra a versão publicada (os 7 primeiros caracteres do commit) com um toque, para saber qual build
   está no ar. Confira também se o `MODEL_CHAIN` da Vercel é o mesmo do passo 3.

## API

`POST /api/documents` recebe uma nota, recibo ou extrato e devolve os campos extraídos.
Multipart com `file` (JPEG, PNG, WebP ou PDF, até 4 MB; o app reduz fotos grandes no aparelho antes de enviar) e `kind` (`nota`, `recibo` ou `extrato`; padrão `nota`).

```bash
curl -X POST http://localhost:3000/api/documents \
  -F "file=@fixtures/eval/nfse-01.png" -F "kind=nota"
```

| Resposta | Significado |
|---|---|
| `200` `status: "extracted"` | Extraída. `extraction.data` traz os campos; `extraction.status` é `accepted` ou `needs_review`; `trace` mostra cada tentativa (modelo, resultado, latência). `issues` pode trazer avisos mesmo numa extração aceita: por exemplo, a chave de acesso que não passou no dígito verificador e foi descartada |
| `200` `status: "duplicate"` | Esse arquivo já foi enviado: devolve a extração existente, sem gastar IA |
| `200` `status: "manual_entry"` | A IA não pôde ler (`reason`: `quota_exceeded` ou `all_providers_failed`): abrir o formulário manual |
| `400` / `413` / `415` | Sem arquivo ou `kind` inválido / arquivo grande demais / formato não suportado |
| `429` | Muitos envios novos em pouco tempo (teto de 30 a cada 10 minutos). Tente de novo em instantes |
| `503` | Perfil de demonstração não configurado (cadastre o MEI ou rode `npm run seed`) |
| `500` | Erro interno (sem detalhes ao cliente; o log do servidor tem a causa) |

A extração **não entra no limite** até o usuário confirmar (`POST /api/transactions`, abaixo).

### Confirmar um lançamento

`POST /api/transactions` (JSON) registra o lançamento **depois da conferência do usuário**. Só a partir daqui o valor conta no limite.

| Campo | Obrigatório | Observação |
|---|---|---|
| `date` | sim | `AAAA-MM-DD`: a data que conta para o limite. Até amanhã (fuso), nunca depois |
| `amountCents` | sim | Inteiro positivo, em centavos |
| `source` | sim | `nota`, `pix` ou `manual` |
| `issuerTaxId` / `recipientTaxId` | não | CPF/CNPJ de **quem vendeu ou recebeu** / de **quem comprou ou pagou** |
| `kind` | só se preciso | `receita` ou `despesa`. O código decide pelo CNPJ do MEI; só envie se a resposta for `direction_required`. Se o CNPJ do MEI aparece na nota e o `kind` enviado contradiz, a resposta é `direction_conflict` |
| `documentId`, `accessKey`, `issueDate`, `description`, `confidence` | não | `documentId` e `accessKey` evitam lançamento duplicado |

Campos não listados (por exemplo `status`, `id`, `profileId`) são **recusados**: o cliente nunca os define.

| Resposta | Significado |
|---|---|
| `201` `status: "created"` | Lançamento criado e confirmado |
| `200` `status: "duplicate"` | Já existia (mesmo documento ou mesma chave de acesso): devolve o existente |
| `422` | Regra de negócio: `invalid_amount`, `invalid_date`, `future_date`, `invalid_tax_id`, `invalid_access_key`, `direction_required` ou `direction_conflict` |
| `400` / `413` / `503` / `500` | Corpo inválido ou com campo proibido / grande demais / sem perfil de demo / erro interno |

Toda rota que grava (`POST`, `PUT`, `PATCH`) exige `Content-Type: application/json` (ou multipart no upload),
recusa requisições de outra origem (`403`) e limita o tamanho do corpo. Ver [docs/SEGURANCA.md](docs/SEGURANCA.md).

### Cancelar e corrigir um lançamento

`PATCH /api/transactions/:id` com `{"action":"cancel"}` ou `{"action":"correct","amountCents":…,"date":…,"description":…}`.
Só valor, data e descrição mudam; tipo e partes nunca. Tudo fica no histórico (`transaction_events`).
`404` se não existe, `409` ao corrigir um lançamento cancelado, `422` nas regras de valor e data.

### Testar o e-mail de alerta

O remetente padrão (`onboarding@resend.dev`) só entrega ao e-mail da **conta do Resend**. Para testar:
1. Troque o e-mail do perfil para o da sua conta do Resend (aba Mais → lápis; em desenvolvimento a edição aparece sozinha).
2. Dispare o cron, no PowerShell, lendo o segredo do `.env.local` sem mostrá-lo:

```powershell
$s = (Select-String -Path .env.local -Pattern '^CRON_SECRET=(.*)$').Matches[0].Groups[1].Value
Invoke-RestMethod -Uri http://localhost:3000/api/cron/alerts -Headers @{Authorization="Bearer $s"}
```

A resposta é `sent` (saiu), `failed` (o Resend recusou; o alerta volta para a fila), `not_configured` (sem chave) ou
`nothing_due` (nada pendente). O alerta é idempotente: para repetir o teste, no SQL Editor do Supabase,
`update alerts set sent_at = null where kind = 'threshold_warning';`. Depois do teste, volte o e-mail do perfil para um fictício.

### Outras rotas

- `PUT /api/profile`: cadastra o MEI no primeiro uso. Em produção, **mudar um cadastro existente é recusado**
  (`403 edit_disabled`) a menos que `ALLOW_PROFILE_EDIT=true`.
- `GET /api/report`: baixa os lançamentos do ano em CSV (com proteção contra injeção de fórmula).
- `GET /api/cron/alerts`: dispara os alertas por e-mail. Exige `Authorization: Bearer <CRON_SECRET>`
  (a Vercel envia sozinha; ver `vercel.json`).

### Listar e painel

- `GET /api/transactions?year=2026`: lançamentos do ano (padrão: o ano de hoje, em Brasília), por data.
- `GET /api/dashboard`: o resumo do ano de hoje: `limitCents` (proporcional se abriu no ano), `accumulatedCents`,
  `headroomCents`, `usedRatio`, `band` (`ok`, `attention`, `critical`, `over_tolerance`, `over_retroactive`),
  `cost` (**estimativa**), `projection` (ritmo e data prevista de cruzar o limite), `das`
  (próximo vencimento), `alerts` e `pendingCount`. Só receitas **confirmadas** entram.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção (o que a Vercel roda) |
| `npm test` | Testes unitários (Vitest) |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint |
| `npm run check` | Lint + tipos + testes (a CI roda isso e mais o eval em replay com limiares) |
| `npm run check:supabase` | Confere a conexão e o schema do banco (não imprime chaves) |
| `npm run check:ai` | Faz uma chamada real a cada modelo da cadeia (usa a cota gratuita) |
| `npm run check:db` | Testa no banco real a cota diária, o cooldown, o storage e o perfil de demo (apaga o que cria) |
| `npm run seed` | Cria o perfil de demonstração fictício (idempotente; só quem criou o banco) |
| `npm run seed:demo` | Cria receitas fictícias para o painel (`-- --reset` apaga, `-- --total N` define o total) |
| `npm run eval` | Avalia a extração nas notas sintéticas, repetindo respostas gravadas (sem rede). Reescreve `docs/EVAL-RESULTS.md`; `-- --no-write` só mostra |
| `npm run eval:record` | Regrava as respostas chamando os modelos de verdade (usa a cota gratuita) |
| `npm run fixtures:generate` | Regenera as notas sintéticas e o gabarito |

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `Configuração inválida: ...` | Variável faltando ou com formato errado no `.env.local` | Corrija cada item listado e salve o arquivo |
| `NEXT_PUBLIC_SUPABASE_URL deve terminar em .supabase.co` | A URL veio com `/rest/v1` no final | Apague tudo depois de `.supabase.co` |
| `check:supabase` com `FALHA` nas tabelas | Migração não aplicada, ou URL/chave de outro projeto | Rode o `0001_init.sql` (só no projeto novo) e confira a URL |
| `check:ai` com `503 ... high demand` | Sobrecarga temporária do Google | Não é erro nosso. Tente de novo mais tarde; a cadeia já usa o próximo modelo |
| `check:ai` com `429` | Cota do plano gratuito esgotada | Espere o limite zerar (o do Google zera à meia-noite no fuso do Pacífico) |
| `check:ai` com `403` ou `401` | Chave inválida, expirada ou conta bloqueada | Gere outra chave. Conta de empresa pode estar bloqueada |
| "permission denied" no AI Studio | Conta corporativa (Workspace) | Use um Gmail pessoal, em janela anônima, e aceite os termos |
| `npm install` falha com `ETARGET typescript-eslint` | Publicação parcial do pacote no npm | O `package.json` já fixa a versão; rode `npm install` de novo |
| A rota `/api/documents` devolve `503` "Perfil de demonstração não configurado" | Banco sem o perfil de demo | Rode `npm run seed` (só uma vez, só quem criou o banco) |
| O lápis de editar o perfil não aparece | Em produção a edição do cadastro é bloqueada por padrão | Em desenvolvimento aparece sozinho. Em produção, `ALLOW_PROFILE_EDIT=true` (e refaça o build: a tela é pré-renderizada) |
| O endereço da Vercel pede login | *Vercel Authentication* ligada no projeto | Settings → Deployment Protection → desligar, para o link ser público |
| `eval` diz "sem gravação" | O prompt mudou e as gravações antigas deixaram de valer | `npm run eval:record` (usa a cota gratuita) |
| Notas do `fixtures:generate` com fonte diferente | O gerador usa fontes do sistema (Arial, Courier New, Segoe Script) | Só para regenerar. As imagens já estão no repositório |

## Regras de segurança do time

- **Nunca** commite o `.env.local` (o `.gitignore` já o bloqueia; confira com `git status`).
- **Nunca** cole chaves em chat, issue, PR ou print. Se vazar, gere outra no painel do provedor.
- Ative a **verificação em duas etapas (MFA)** nas contas do GitHub e do Supabase: o projeto guarda a chave secreta do banco.
- A chave `SUPABASE_SERVICE_ROLE_KEY` ignora todas as proteções do banco: só no servidor.
- **Só dados sintéticos** em testes, avaliação e demo. Os planos gratuitos de IA podem usar o
  conteúdo enviado para melhorar os produtos.
- Alterações de comportamento da IA (prompt, schema) sobem a versão do prompt e exigem
  regravar o eval.

## Como trabalhamos

> Quem usa um assistente de IA (Claude Code, Codex, Cursor…) deve deixá-lo ler o [AGENTS.md](AGENTS.md)
> e o [docs/TAREFAS.md](docs/TAREFAS.md) primeiro: lá estão as regras do projeto e o que cada um vai fazer.

- **Acesso ao repositório:** o dono do repositório convida cada integrante em
  GitHub → **Settings → Collaborators → Add people**. Sem isso não dá para enviar branches
  nem abrir PRs. Cada integrante deve commitar com o próprio nome e e-mail
  (`git config user.name` e `git config user.email`), para o histórico mostrar a contribuição dos três.
- Branches curtas (vida de um dia) e pull request para a `main`; a CI precisa passar antes do merge.
- Mensagens de commit no formato `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- `git pull --rebase` antes de começar uma tarefa e antes de abrir o PR.
- Merge com "merge commit" ou "rebase", sem squash, para manter o histórico dos três.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Camadas, fluxos, segurança, falhas, testes e decisões |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Schema do banco, restrições e regras de consistência |
| [docs/AI-ENGINEERING.md](docs/AI-ENGINEERING.md) | Práticas de engenharia de IA e avaliação |
| [docs/mei-rules.md](docs/mei-rules.md) | Regras do MEI, fontes e questões em aberto |
| [docs/PLANO.md](docs/PLANO.md) | Calendário, frentes de trabalho e definição de pronto |
| [docs/TAREFAS.md](docs/TAREFAS.md) | Tarefas da equipe até o envio, com critério de pronto |
| [AGENTS.md](AGENTS.md) | Guia para agentes de IA e para quem chega: regras, comandos, convenções e armadilhas |
| [docs/AUDITORIA.md](docs/AUDITORIA.md) | Estado de qualidade: desenho × implementação |
| [docs/EVAL-RESULTS.md](docs/EVAL-RESULTS.md) | Resultados da avaliação da extração (gerado) |
| [docs/INTERFACE.md](docs/INTERFACE.md) | Telas, decisões de design, acessibilidade e navegação fluida |
| [docs/SEGURANCA.md](docs/SEGURANCA.md) | Modelo de ameaças, defesas, riscos aceitos e o que falta |
| [docs/REVISAO.md](docs/REVISAO.md) | Quatro rodadas de revisão (UX, acessibilidade, segurança, cor e design): o que foi corrigido e o que ficou |

## Qualidade da extração (medida)

Avaliação em **26 notas sintéticas** com gabarito (prompt v4), repetindo respostas gravadas dos modelos
(`npm run eval`, sem rede). Resultado da cadeia completa, o que o usuário vive:

| Resultado | Notas | Taxa |
|---|---|---|
| Aceita automaticamente e completa (data, valor, emissor e destinatário certos) | 26 | 100% |
| Aceita automaticamente e **errada para o limite** (erro silencioso) | 0 | 0% |
| Enviada para revisão manual | 0 | 0% |
| Falha total (nenhum modelo respondeu) | 0 | 0% |

Por modelo, cada um sozinho: `gemini-3.5-flash-lite` e `gemini-flash-lite-latest` gravados nas 26 notas, núcleo
completo em 100%, chave de acesso certa em 96%, passam nas regras em 96%, mediana de 2,3 s e 2,5 s. Comparado ao
prompt v3 nesses dois modelos: núcleo 96% → 100%, destinatário 96% → 100%, chave 88% → 96%, regras 84% → 96%.

**Leia com cuidado:**

- O conjunto é pequeno e sintético, e cada resposta foi gravada **uma vez** (os modelos não são determinísticos).
- O Nemotron e o `gemini-3.6-flash` estão **sem gravação no v4** (0 de 26): a cota diária gratuita do OpenRouter
  acabou durante os testes de 25/11, e a do `3.6-flash` é pequena.
- O "0% para revisão" vem em parte de uma decisão de código: a chave de acesso que não passa no dígito verificador
  é **descartada** (a nota segue, com aviso na conferência), em vez de mandar a nota para revisão. A chave só serve
  para reconhecer nota repetida; não muda valor, data nem direção.
- Nada entra no acumulado sem a confirmação do usuário. Detalhes em [docs/EVAL-RESULTS.md](docs/EVAL-RESULTS.md) e
  [docs/AI-ENGINEERING.md](docs/AI-ENGINEERING.md).

No app de verdade (6 notas fictícias, 25/11, **antes** das otimizações de tempo e do prompt v4): mediana de
**8,7 s por leitura** (a cadeia anterior levava 26 s), nenhuma caiu para o preenchimento manual. Depois disso, o
tempo fora da IA (gravar o arquivo, consultar o banco) caiu de 2,0–3,8 s para 0,9–1,3 s, medido da máquina local
contra o Supabase em Oregon; a leitura completa não foi medida de novo.

## Limitações conhecidas

- Cobre o MEI comum; categorias com limite diferente estão fora do escopo.
- O custo do estouro é uma estimativa, não cálculo oficial.
- Demonstração com perfil único e dados fictícios, **sem login**. Qualquer pessoa com o endereço pode ler os
  lançamentos (com CPF/CNPJ mascarados), enviar notas (limitadas por janela e por cota diária) e cancelar ou
  corrigir lançamentos. Para uso real, autenticação é o primeiro passo.
- A projeção é linear e não considera sazonalidade.
- PDF acima de 4 MB é recusado (fotos grandes são reduzidas no aparelho, PDF não).
- O lembrete do vencimento do DAS por e-mail não existe (a tabela de alertas guarda uma data por ano).
- A conciliação do extrato não é salva: o CSV é lido no navegador e some ao fechar a aba.
- "Para conferir" nunca recebe notas: nenhum fluxo grava o status `pendente` (a nota lida fica só na tela até
  ser confirmada). O contador é sempre 0, e o Painel mostra "Tudo conferido"; o filtro "Conferir" saiu do Histórico
  por isso.
- A interface não tem testes automatizados (só a lógica tem); foi verificada à mão no navegador e no iPhone do
  dono do projeto, não em Android nem com leitor de tela. Ver [docs/REVISAO.md](docs/REVISAO.md).

## Estado atual

Feito:

- [x] Núcleo de regras do MEI com testes
- [x] Roteador de modelos em cadeia (failover, cooldown, orçamento de tempo, cota diária, segundo modelo em
  paralelo depois de 7 s e "último recurso" para quem estava em cooldown) e adaptadores Gemini e OpenRouter
- [x] Harness de avaliação da extração ([resultados](docs/EVAL-RESULTS.md)) e porta de qualidade na CI
- [x] Upload e extração com persistência (a IA lê enquanto o arquivo é gravado), confirmação de lançamentos,
  cancelar e corrigir (com histórico)
- [x] Interface completa: painel, enviar nota, lançar sem nota, simulador, histórico e detalhe, extrato, relatório, alertas, transparência da IA, perfil, regras, instalar e primeiros passos (16 telas)
- [x] Alertas por e-mail e cron (Resend), idempotentes e com reserva atômica; e-mail real enviado e recebido em
  25/11 (chamada local ao cron). O cron agendado da Vercel ainda não rodou
- [x] Revisões de UX, acessibilidade, segurança e cor, quatro rodadas ([REVISAO.md](docs/REVISAO.md), [SEGURANCA.md](docs/SEGURANCA.md))
- [x] 470 testes automatizados em 46 arquivos (em 26/11), lint e tipos limpos, `npm audit` sem vulnerabilidades de produção
- [x] `gitleaks` e `npm audit` na CI, arquivo `LICENSE` (MIT) e Dependabot (PR #13)
- [x] PR #21 da `feat/chave-e-latencia` mesclado (prompt v4, upload mais rápido, abas novas, quarta revisão)

Falta para o envio (prazo: 30/11, 23h59):

- [ ] Abrir e mesclar o PR com os ajustes de interface feitos depois do #21 na mesma branch (Simular com uma
  resposta só, Regras escritas para leigo, saída retroativa "desde a abertura" no ano de abertura, Histórico mês a
  mês com busca, cápsula deslizante nas abas)
- [ ] Desligar a proteção por login da Vercel (link público). A migração `0002` já está aplicada no banco do projeto
- [ ] Link da demo pública e vídeo de até 3 minutos
- [ ] Questão de negócio em aberto: a data que conta é a de emissão ou a de recebimento ([mei-rules.md](docs/mei-rules.md))
- [ ] Gravar o Nemotron e o `gemini-3.6-flash` no eval v4 (com cota nova) e repetir as gravações em outro horário

Depois do hackathon:

- [ ] Autenticação e vários MEIs (hoje: perfil único, sem login)
- [ ] Lembrete do vencimento do DAS (precisa guardar uma data por mês)
- [ ] Guardar a nota lida e não confirmada como `pendente`, para "Para conferir" ter uso
- [ ] Melhorar o funcionamento dos modelos (menos 503 do Gemini, mais cobertura de gravações)

## Nota técnica

`package.json` fixa `typescript-eslint` em `8.73.0` (campo `overrides`) por causa
de uma publicação parcial da versão 8.74.0 no npm em 23/11/2026. Remover quando
o registro estabilizar.

## Licença

[MIT](LICENSE).
