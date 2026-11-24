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

- Lê foto ou PDF de notas e recibos com IA e pede confirmação com um clique.
- Painel: receita acumulada, percentual do limite, folga e projeção de estouro.
- Limite proporcional para quem abriu o MEI no meio do ano.
- Simulador: "e se eu aceitar uma venda de R$ X?", com o custo estimado.
- Cruza o extrato bancário com as notas e aponta entradas sem nota.
- Alertas de 80% e 100% do limite e lembrete do DAS.

## Como funciona (resumo)

**A IA propõe, o código dispõe.** O modelo só extrai os campos do documento.
Limites, risco, projeção, alertas e conciliação são código próprio em
`src/core`, puro e testado. A extração passa por uma **cadeia de modelos
gratuitos** de mais de um fornecedor, com failover, escalonamento por qualidade
e validação determinística da resposta.

## Estrutura

```
src/
  core/      regras do MEI: puras, sem I/O, 100% testáveis
  server/    extração com IA (cadeia de provedores), avaliação, casos de uso
  app/       interface e rotas (Next.js)
supabase/    migrações do banco
fixtures/    notas sintéticas, gabarito e respostas gravadas dos modelos (eval)
scripts/     verificações de ambiente, gerador de notas e runner do eval
docs/        arquitetura, modelo de dados, regras do MEI, plano
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
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys | Opcional até os alertas por e-mail entrarem. Pode ficar vazio. |
| `CRON_SECRET` | Você inventa | **Mínimo de 16 caracteres.** Veja como gerar abaixo. |
| `EXTRACTION_DAILY_QUOTA` | Padrão `200` | Teto diário de extrações com IA, para proteger a cota gratuita. |
| `DEMO_PROFILE_EMAIL` | Opcional | E-mail do perfil de demonstração (recebe os alertas). Só é lido pelo `npm run seed`. |

Valor atual do `MODEL_CHAIN` (do modelo mais leve ao mais forte):

```
MODEL_CHAIN=gemini:gemini-3.1-flash-lite,gemini:gemini-3.8-flash,openrouter:nvidia/nemotron-3.5-super-vl:free
```

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

Deve listar as 10 tabelas como `OK`, o bucket `documents` como privado e terminar com
`Tudo certo.`

### 5. Chaves de IA

```bash
npm run check:ai
```

Faz **uma chamada real por modelo** (gasta 1 requisição da cota gratuita de cada um).
Para testar só um provedor: `npm run check:ai -- gemini`.

### 6. Rodar e validar

```bash
npm run dev     # http://localhost:3000
npm run check   # lint + tipos + testes (o mesmo que a CI roda)
npm run eval    # avaliação da extração, repetindo respostas gravadas (sem rede)
```

## API

`POST /api/documents` recebe uma nota, recibo ou extrato e devolve os campos extraídos.
Multipart com `file` (JPEG, PNG, WebP ou PDF, até 4 MB) e `kind` (`nota`, `recibo` ou `extrato`; padrão `nota`).

```bash
curl -X POST http://localhost:3000/api/documents \
  -F "file=@fixtures/eval/nfse-01.png" -F "kind=nota"
```

| Resposta | Significado |
|---|---|
| `200` `status: "extracted"` | Extraída. `extraction.data` traz os campos; `extraction.status` é `accepted` ou `needs_review`; `trace` mostra cada tentativa (modelo, resultado, latência) |
| `200` `status: "duplicate"` | Esse arquivo já foi enviado: devolve a extração existente, sem gastar IA |
| `200` `status: "manual_entry"` | A IA não pôde ler (`reason`: `quota_exceeded` ou `all_providers_failed`): abrir o formulário manual |
| `400` / `413` / `415` | Sem arquivo ou `kind` inválido / arquivo grande demais / formato não suportado |
| `503` | Perfil de demonstração não configurado (`npm run seed`) |
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
| `kind` | só se preciso | `receita` ou `despesa`. O código decide pelo CNPJ do MEI; só envie se a resposta for `direction_required` |
| `documentId`, `accessKey`, `issueDate`, `description`, `confidence` | não | `documentId` e `accessKey` evitam lançamento duplicado |

Campos não listados (por exemplo `status`, `id`, `profileId`) são **recusados**: o cliente nunca os define.

| Resposta | Significado |
|---|---|
| `201` `status: "created"` | Lançamento criado e confirmado |
| `200` `status: "duplicate"` | Já existia (mesmo documento ou mesma chave de acesso): devolve o existente |
| `422` | Regra de negócio: `invalid_amount`, `invalid_date`, `future_date`, `invalid_tax_id`, `invalid_access_key` ou `direction_required` |
| `400` / `413` / `503` / `500` | Corpo inválido ou com campo proibido / grande demais / sem perfil de demo / erro interno |

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
| `npm test` | Testes unitários (Vitest) |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint |
| `npm run check` | Lint + tipos + testes (o mesmo que a CI roda) |
| `npm run check:supabase` | Confere a conexão e o schema do banco (não imprime chaves) |
| `npm run check:ai` | Faz uma chamada real a cada modelo da cadeia (usa a cota gratuita) |
| `npm run check:db` | Testa no banco real a cota diária, o cooldown, o storage e o perfil de demo (apaga o que cria) |
| `npm run seed` | Cria o perfil de demonstração fictício (idempotente; só quem criou o banco) |
| `npm run eval` | Avalia a extração nas notas sintéticas, repetindo respostas gravadas (sem rede) |
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
| [docs/AUDITORIA.md](docs/AUDITORIA.md) | Estado de qualidade: desenho × implementação |
| [docs/EVAL-RESULTS.md](docs/EVAL-RESULTS.md) | Resultados da avaliação da extração (gerado) |

## Limitações conhecidas

- Cobre o MEI comum; categorias com limite diferente estão fora do escopo.
- O custo do estouro é uma estimativa, não cálculo oficial.
- Demonstração com perfil único e dados fictícios, sem login.
- A projeção é linear e não considera sazonalidade.

## Estado atual

- [x] Núcleo de regras do MEI com testes
- [x] Roteador de modelos em cadeia com testes (failover, cooldown, orçamento de tempo, cota diária)
- [x] Validação de ambiente e migração inicial do banco
- [x] Adaptadores dos provedores de IA (Gemini e OpenRouter)
- [x] Harness de avaliação da extração ([resultados](docs/EVAL-RESULTS.md))
- [x] Upload e extração com persistência: `POST /api/documents` (validação, hash, Supabase, cadeia de IA)
- [x] Confirmação de lançamentos e painel: `POST/GET /api/transactions` e `GET /api/dashboard`
- [ ] Extrato (importar CSV e conciliar), cancelar e corrigir lançamento
- [ ] Interface (upload, confirmação, painel, simulador)
- [ ] Alertas por e-mail e cron

## Nota técnica

`package.json` fixa `typescript-eslint` em `8.73.0` (campo `overrides`) por causa
de uma publicação parcial da versão 8.74.0 no npm em 23/11/2026. Remover quando
o registro estabilizar.
