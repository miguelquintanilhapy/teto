# Plano de execução

Janela: **23/11 a 30/11/2026**. O envio fecha em 30/11 às 23h59 e o repositório
**congela** nesse horário. A meta real é **fechar em 29/11**; o dia 30 é reserva.

Ver também: [arquitetura](ARCHITECTURE.md) · [modelo de dados](DATA-MODEL.md) ·
[auditoria](AUDITORIA.md).

## Andamento (23/11)

- [x] Fase 0 de fundação, mesclada na `main`
- [x] Adaptadores Gemini e OpenRouter, com a cadeia montada por `MODEL_CHAIN`
- [x] Harness de avaliação com notas sintéticas, gravação/replay e relatório
- [x] Persistência da extração: cooldown e cota no Postgres, serviço com idempotência por hash e `POST /api/documents`
- [ ] Repositórios de transações e rotas de confirmação, painel e extrato (frente B)
- [ ] Interface, alertas e e-mail (frente C)
- [ ] Questões de negócio do MEI confirmadas em fonte oficial

## Como trabalhamos

- Branches curtas (vida de no máximo um dia) e pull request para a `main`; a CI
  precisa estar verde antes do merge. Sem revisão obrigatória.
- Mensagens no formato `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- `git pull --rebase` antes de começar e antes do PR.
- Os três commitam; o histórico do GitHub mostra a contribuição de cada um.
- Merge com "merge commit" ou "rebase", **sem squash**, para manter o histórico.
- Nunca commitar `.env.local`. Dados de teste são sempre sintéticos.

## Fase 0: fundação (hoje, 23/11)

Decisões do desenho que viram código antes de a equipe se dividir:

- [ ] Cadastrar o rascunho no painel do Hack Brasil
- [ ] Criar chaves (AI Studio, OpenRouter) e conferir limites e modelos atuais
- [ ] Criar projeto no Supabase e conta no Resend
- [x] `Transaction.status` (`pendente | confirmada | cancelada`) no `core`
- [x] Porta `Clock` e cálculo de "hoje" em `America/Sao_Paulo`
- [x] `rulesFor(year)` com a configuração versionada por ano
- [x] `totalBudgetMs` e `capabilities` no roteador de extração
- [x] Portas `CooldownStore` e `QuotaGuard`, com versões em memória
- [ ] Porta `Notifier` (e-mail), com versão em memória (entra com os alertas)
- [x] Validação das variáveis de ambiente com Zod
- [x] Remover o boilerplate do Next (página, `public/*.svg`, favicon)
- [x] Migração inicial do Supabase a partir de `DATA-MODEL.md` (escrita; falta aplicar no projeto)
- [ ] Implementações Postgres de `CooldownStore` e `QuotaGuard` (frente A/B)

## Frentes (cada pessoa é full-stack; a divisão é por fatia de produto)

| Frente | Escopo |
|---|---|
| **A: IA** | Adaptadores Gemini e OpenRouter, `CooldownStore` em Postgres, cache por hash, notas sintéticas, harness `eval`, casos adversariais, rastro persistido |
| **B: Dados e fluxo** | Migração, repositórios, rotas `/api` (upload, extração, confirmação, transações), validação de upload, `QuotaGuard`, conciliação de extrato |
| **C: Painel e alertas** | Interface mobile-first (upload, confirmação, painel, simulador), alertas e e-mails, cron, tela `/ia`, relatório |

## Calendário

| Dia | A: IA | B: Dados e fluxo | C: Painel e alertas |
|---|---|---|---|
| **Seg 23** | Fase 0 (portas, budget, capabilities) · adaptadores Gemini/OpenRouter | Fase 0 (migração, Clock, status) | Layout base, identidade visual, painel com dados falsos |
| **Ter 24** | Cache por hash, `CooldownStore` Postgres | Repositórios + `/api/documents` + validação de upload | Upload e confirmação (mobile) |
| **Qua 25** | Notas sintéticas + gabarito + `eval` | Rotas de transações e perfil | Painel com dados reais |
| **Qui 26** | Adversariais, versão do prompt, rastro, replay | Importação de extrato + conciliação | Simulador |
| **Sex 27** | Ajuste da cadeia com os números do eval | Cron + `newAlerts` + registro de alertas | E-mails, lembrete do DAS, `/ia` |
| **Sáb 28** | **Integração e bugs**, dados de seed da demo | Deploy na Vercel, variáveis, `/api/health` | Polimento, estados de erro, responsivo |
| **Dom 29** | README com tabela do eval, limitações | Congelar o deploy, testar no celular | **Gravar o vídeo**, editar, publicar |
| **Seg 30** | Reserva (só correção crítica) | **Enviar no painel** antes das 23h59 | Conferir vídeo e links |

## Marcos de controle

- **Qua 25 à noite:** "foto → extração → confirmar → painel atualiza" funcionando.
  Se não estiver, cortar escopo na quinta.
- **Sáb 28 à noite:** demo publicada, com os três exemplos funcionando no link.
- **Dom 29 à noite:** último commit, vídeo pronto, README final.

## Ordem de corte

Cortar nesta ordem se o prazo apertar:
1. Testes por propriedade e extração dupla por risco
2. Casos adversariais além do mínimo
3. Relatório mensal em PDF
4. Importação de extrato e conciliação
5. Explicação em linguagem simples pela IA

**Não cortar:** upload e extração, confirmação, painel com projeção, simulador,
alertas, `eval` básico, tratamento de erro na interface e o vídeo.

## Definição de pronto para o envio

- [ ] Repositório público, criado após 4/11, sem fork, com commits dos três
- [ ] `npm run check` verde na `main`; CI com `gitleaks` e `npm audit`
- [ ] Demo em HTTPS testada em outro dispositivo e em janela anônima
- [ ] Vídeo de até 3 minutos, aberto sem login, mostrando o produto funcionando
- [ ] README com demo, arquitetura, tabela do eval, limitações e como rodar
- [ ] Regras do MEI confirmadas em fonte oficial e registradas
- [ ] Nenhuma chave no histórico; nenhum dado real de terceiros
- [ ] Nome, frase, descrição e trilha preenchidos no painel do hackathon
- [ ] Último commit antes de 30/11 às 23h59

## Roteiro do vídeo (3 minutos)

| Tempo | Conteúdo |
|---|---|
| 0:00–0:20 | A dor: a doceira que estoura o limite sem perceber |
| 0:20–2:10 | Demo ao vivo: 3 notas, dados extraídos, painel, alerta, simulador, projeção |
| 2:10–2:45 | Por dentro: cadeia de modelos com failover, validação por código, tabela do eval |
| 2:45–3:00 | Impacto, canal por contadores e próximos passos |

## Riscos

| Risco | Resposta |
|---|---|
| Cota gratuita acaba na demo | Cache por hash, replay das notas de exemplo, `QuotaGuard` |
| Regra do MEI ou alíquota incorreta | Confirmar na fonte oficial na terça; rotular custo como estimativa |
| Integração tardia entre as frentes | Contratos (schema e tipos) fechados na Fase 0; merges pequenos diários |
| Vídeo deixado para o fim | Roteiro escrito na quinta, gravação no domingo |
| Deploy quebra perto do prazo | Deploy já no sábado; `/api/health` conferido antes de gravar |
