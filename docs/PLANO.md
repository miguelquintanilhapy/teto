# Plano de execução

Janela: **23/11 a 30/11/2026**. O envio fecha em 30/11 às 23h59 e o repositório
**congela** nesse horário. A meta real é **fechar em 29/11**; o dia 30 é reserva.

Ver também: [arquitetura](ARCHITECTURE.md) · [modelo de dados](DATA-MODEL.md) ·
[auditoria](AUDITORIA.md) · [tarefas da equipe](TAREFAS.md).

## Andamento (27/11)

- [x] Fase 0 de fundação, mesclada na `main`
- [x] Adaptadores Gemini e OpenRouter, com a cadeia montada por `MODEL_CHAIN`
- [x] Harness de avaliação com notas sintéticas, gravação/replay e relatório
- [x] Persistência da extração: cooldown e cota no Postgres, serviço com idempotência por hash e `POST /api/documents`
- [x] Confirmação de lançamentos e painel, com a direção decidida pelo código
- [x] Extrato (importar CSV e conciliar), cancelar e corrigir lançamento
- [x] Interface completa ([INTERFACE.md](INTERFACE.md)): 16 telas, tema claro e escuro, instalável
- [x] Alertas e e-mail: serviço idempotente, cron diário e tela de alertas. E-mail real enviado e recebido em 25/11
  (chamada local ao cron); o cron agendado da Vercel ainda não rodou
- [x] Revisões de UX, acessibilidade, segurança e cor ([REVISAO.md](REVISAO.md), [SEGURANCA.md](SEGURANCA.md))
- [x] Questões de negócio do MEI: limite, tolerância e DAS confirmados em fonte oficial
- [ ] Questão de negócio: a data que conta para o limite (emissão ou recebimento) segue **sem fonte oficial**
- [x] Migração `0002` aplicada no banco do projeto
- [x] PRs #10, #11 e #12 mesclados na `main` (interface e cadeia nova de 4 modelos)
- [x] PR #13 mesclado: `npm audit` e `gitleaks` na CI, `LICENSE` (MIT) e Dependabot
- [x] PR #21 mesclado (`feat/chave-e-latencia`): prompt v4 para a chave de acesso, chave inválida descartada em vez
  de reprovar a nota, upload mais rápido (a IA lê enquanto o arquivo é gravado), abas novas (Painel, Simular,
  Histórico, Mais) e a quarta rodada de revisão de design
- [x] PR #22 mesclado em 26/11 (mesma branch): Simular com uma resposta só, Regras escritas para leigo, saída
  retroativa "desde a abertura" no ano de abertura, cápsula deslizante nas abas
- [ ] Ajustes depois do #22, na mesma branch, ainda sem PR: Histórico mês a mês com busca (26/11); extrato do
  PicPay e tela do extrato refeita, cancelados num grupo próprio, quadradinhos de ícone com cor no Painel, botões
  secundários em azul, mãozinha e hover com mouse (27/11) ([REVISAO.md](REVISAO.md))
- [ ] Deixar o link da Vercel público e gravar o vídeo

## Como trabalhamos

- Branches curtas (vida de no máximo um dia) e pull request para a `main`; a CI
  precisa estar verde antes do merge. O GitHub não exige revisão, mas cada PR pede revisão de outro integrante
  ([TAREFAS.md](TAREFAS.md)) quando houver alguém disponível.
- Mensagens no formato `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- `git pull --rebase` antes de começar e antes do PR.
- **Até 25/11 os commits são de um autor só** (o dono do repositório). O regulamento pede commits dos três: as
  tarefas de [TAREFAS.md](TAREFAS.md) existem para isso, e cada um commita com o próprio nome e e-mail.
- Merge com "merge commit" ou "rebase", **sem squash**, para manter o histórico.
- Nunca commitar `.env.local`. Dados de teste são sempre sintéticos.

## Fase 0: fundação (23/11)

Decisões do desenho que viram código antes de a equipe se dividir:

- [ ] Cadastrar o rascunho no painel do Hack Brasil
- [x] Criar chaves (AI Studio, OpenRouter) e conferir limites e modelos atuais. Os modelos originais
  (`gemini-3.1-flash-lite` e `gemini-3.8-flash`) foram trocados em 25/11, porque davam 503 quase sempre
  ([AI-ENGINEERING.md](AI-ENGINEERING.md))
- [x] Criar projeto no Supabase e conta no Resend
- [x] `Transaction.status` (`pendente | confirmada | cancelada`) no `core`
- [x] Porta `Clock` e cálculo de "hoje" em `America/Sao_Paulo`
- [x] `rulesFor(year)` com a configuração versionada por ano
- [x] `totalBudgetMs` e `capabilities` no roteador de extração
- [x] Portas `CooldownStore` e `QuotaGuard`, com versões em memória
- [x] Porta de e-mail (`EmailSender`), com Resend e versão em memória
- [x] Validação das variáveis de ambiente com Zod
- [x] Remover o boilerplate do Next (página, `public/*.svg`, favicon)
- [x] Migração inicial do Supabase a partir de `DATA-MODEL.md` (`0001` e `0002` aplicadas)
- [x] Implementações Postgres de `CooldownStore` e `QuotaGuard`

## Frentes do plano original (histórico)

Divisão de 23/11, por fatia de produto. As três frentes foram entregues; fica aqui como registro.

| Frente | Escopo | Situação |
|---|---|---|
| **IA** | Adaptadores Gemini e OpenRouter, `CooldownStore` em Postgres, cache por hash, notas sintéticas, harness `eval`, casos adversariais, rastro persistido | Feito |
| **Dados e fluxo** | Migração, repositórios, rotas `/api` (upload, extração, confirmação, transações), validação de upload, `QuotaGuard`, conciliação de extrato | Feito |
| **Painel e alertas** | Interface mobile-first (upload, confirmação, painel, simulador), alertas e e-mails, cron, tela `/ia`, relatório | Feito |

A divisão de agora é a de [TAREFAS.md](TAREFAS.md), com outras letras: **A** qualidade e publicação (Pessoa 2),
**B** IA e avaliação (Pessoa 3) e **C** entrega (vídeo, link e painel do hackathon).

## Calendário

O plano original, com o que aconteceu de fato:

| Dia | IA | Dados e fluxo | Painel e alertas |
|---|---|---|---|
| **Seg 23** | Fase 0 (portas, budget, capabilities) · adaptadores Gemini/OpenRouter | Fase 0 (migração, Clock, status) | Layout base, identidade visual, painel com dados falsos |
| **Ter 24** | Cache por hash, `CooldownStore` Postgres | Repositórios + `/api/documents` + validação de upload | Upload e confirmação (mobile) |
| **Qua 25** | Notas sintéticas + gabarito + `eval` | Rotas de transações e perfil | Painel com dados reais |
| **Qui 26** | Adversariais, versão do prompt, rastro, replay | Importação de extrato + conciliação | Simulador |
| **Sex 27** | Ajuste da cadeia com os números do eval | Cron + `newAlerts` + registro de alertas | E-mails, ~~lembrete do DAS~~, `/ia` |
| **Sáb 28** | **Integração e bugs**, dados de seed da demo | Deploy na Vercel, variáveis, ~~`/api/health`~~ | Polimento, estados de erro, responsivo |
| **Dom 29** | README com tabela do eval, limitações | Congelar o deploy, testar no celular | **Gravar o vídeo**, editar, publicar |
| **Seg 30** | Reserva (só correção crítica) | **Enviar no painel** antes das 23h59 | Conferir vídeo e links |

- **Feito antes do previsto (até 25/11):** tudo de quinta a sábado, menos o que está riscado: adversariais,
  versão do prompt, rastro e replay; ajuste da cadeia com o eval (cadeia trocada em 25/11); extrato e conciliação;
  simulador; cron, alertas e e-mail; `/ia`; deploy na Vercel (ainda com login); dados de seed da demo; README com
  a tabela do eval e as limitações. O teste no celular começou (iPhone do dono do projeto).
- **Cortado:** lembrete do DAS por e-mail (a tabela de alertas guarda uma data por ano; exige migração) e a rota
  `/api/health` (não existe).
- **Falta:** link público, vídeo, painel do hackathon e as tarefas de [TAREFAS.md](TAREFAS.md).

## Marcos de controle

- ~~**Qua 25 à noite:** "foto → extração → confirmar → painel atualiza" funcionando.~~ Feito.
- **Sáb 28 à noite:** PR da `feat/chave-e-latencia` mesclado, link da Vercel público e testado em janela anônima e
  em outro celular, com os dados da demo restaurados.
- **Dom 29 à noite:** último commit, vídeo publicado, README com o link da demo.

## Ordem de corte

Quase todo o escopo já foi feito. Se o prazo apertar, sacrificar nesta ordem:

1. Testes de interface com Playwright (A4)
2. Ampliar o conjunto de notas e melhorar a leitura da chave (B2 e B3)

(A1 e A2, a CI com `gitleaks` e `npm audit`, a `LICENSE` e o Dependabot, já estão feitos no PR #13.)

**Não cortar:** o vídeo, o link público e o preenchimento do painel do hackathon.

## Definição de pronto para o envio

- [ ] Repositório público, criado após 4/11, sem fork, com commits dos três (hoje, um autor só)
- [x] `npm run check` verde (475 testes em 46 arquivos, em 27/11)
- [x] CI com `gitleaks` e `npm audit`, além de lint, tipos, testes e o eval em replay
- [ ] Demo em HTTPS testada em outro dispositivo e em janela anônima
- [ ] Vídeo de até 3 minutos, aberto sem login, mostrando o produto funcionando
- [ ] README com demo, arquitetura, tabela do eval, limitações e como rodar (falta só o link da demo)
- [ ] Regras do MEI confirmadas em fonte oficial e registradas (feito, menos a data que conta)
- [ ] Nenhuma chave no histórico (`gitleaks` limpo em 26/11, 164 commits, e roda na CI); nenhum dado real de
      terceiros (falta conferir)
- [ ] Nome, frase, descrição e trilha preenchidos no painel do hackathon
- [ ] Último commit antes de 30/11 às 23h59

## Pendências até o envio (ordem sugerida)

O detalhe de cada tarefa, com critério de pronto, está em [TAREFAS.md](TAREFAS.md).

1. ~~Aplicar a migração `0002`~~ (feito).
2. ~~Mesclar `feat/interface-painel` e `feat/melhorar-modelos`~~ (feito, PRs #5 a #12).
3. Abrir o PR da `feat/chave-e-latencia` e mesclar na `main` (a CI precisa passar).
4. Na Vercel: variáveis de ambiente (sem `ALLOW_PROFILE_EDIT`), conferir que o `MODEL_CHAIN` é o do README,
   desligar *Vercel Authentication* e testar o link em janela anônima e em outro celular.
5. Rodar `npm run seed:demo -- --reset` e `npm run seed:demo` para a demo começar com dados limpos.
6. Gravar o vídeo (roteiro abaixo), publicar sem login e colocar o link no README.
7. Preencher nome, frase, descrição e trilha no painel do hackathon.
8. Opcional se sobrar tempo: `gitleaks` e `npm audit` na CI, `LICENSE`, gravações completas do eval.

## Roteiro do vídeo (3 minutos)

| Tempo | Conteúdo |
|---|---|
| 0:00–0:20 | A dor: a doceira que estoura o limite sem perceber |
| 0:20–2:10 | Demo ao vivo: 3 notas, dados extraídos, painel, alerta, simulador, projeção |
| 2:10–2:45 | Por dentro: cadeia de modelos com failover, validação por código, tabela do eval |
| 2:45–3:00 | Impacto, canal por contadores e próximos passos |

Para a gravação:

- **Não gaste a cota antes de gravar:** nada de `check:ai` nem `eval:record` no dia. O OpenRouter gratuito tem
  limite diário por conta e o `gemini-3.6-flash` lê poucas notas por dia.
- Para mostrar a leitura sem depender da IA, reenvie uma nota que já foi enviada: ela volta com os dados lidos da
  primeira vez e o aviso "Você já enviou este arquivo", sem gastar cota; se já foi confirmada, não soma de novo.

## Riscos

| Risco | Resposta |
|---|---|
| Commits de um autor só (o regulamento pede os três) | Cada integrante entrega pelo menos uma tarefa de [TAREFAS.md](TAREFAS.md) com o próprio nome e e-mail |
| Link da demo pede login (*Vercel Authentication* ligada) | Desligar em Settings → Deployment Protection e testar em janela anônima antes de gravar |
| Cota gratuita acaba na demo (OpenRouter com limite diário por conta; `3.6-flash` com poucas leituras por dia) | Cache por hash (reenviar não gasta IA), `QuotaGuard`, não gastar a cota no dia da gravação; sem cota, o app abre o preenchimento manual |
| Gemini responde 503 "alta demanda" | Cadeia de 4 modelos, segundo modelo em paralelo depois de 7 s, cooldown e último recurso |
| Vandalismo dos dados fictícios (sem login, qualquer um cancela e corrige) | Restaurar com `npm run seed:demo -- --reset` e `npm run seed:demo`; tudo fica no histórico |
| Um script esgota o teto global de 30 envios a cada 10 minutos (ou a cota diária) | O app degrada para preenchimento manual; rate limit por IP seria regra de firewall da Vercel ([SEGURANCA.md](SEGURANCA.md)) |
| Regra do MEI ou alíquota incorreta | Limite, tolerância e DAS confirmados em fonte oficial; custo sempre rotulado como estimativa |
| Vídeo deixado para o fim | Roteiro pronto; gravação até domingo |
| Deploy quebra perto do prazo | Deploy já existe; conferir a versão publicada na aba Mais e testar o fluxo completo antes de gravar |
