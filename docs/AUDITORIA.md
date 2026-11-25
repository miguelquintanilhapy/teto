# Auditoria de qualidade do Teto

Registro honesto, separado em **desenho** (o que está decidido) e **implementação**
(o que existe em código). Atualizar a cada marco. Última revisão: 25/11/2026, à noite.

## Veredito

- **Desenho:** completo para o escopo do hackathon. As lacunas foram fechadas em
  decisões registradas em [ARCHITECTURE.md](ARCHITECTURE.md) e
  [DATA-MODEL.md](DATA-MODEL.md). [mei-rules.md](mei-rules.md) lista **5 questões** sem confirmação oficial;
  **2 delas mudam número na tela** (a data que conta para o limite e as alíquotas do custo do estouro). As outras
  3 têm decisão provisória que não muda o produto.
- **Implementação:** o produto existe de ponta a ponta (enviar nota, conferir, confirmar, painel,
  simulador, histórico, extrato, relatório, alertas) e foi revisado em quatro rodadas de UX, acessibilidade,
  segurança, cor e design ([REVISAO.md](REVISAO.md), [SEGURANCA.md](SEGURANCA.md)). Falta o que depende de ação
  fora do código: link público e vídeo. O que sobra está em [PLANO.md](PLANO.md).
- **Limite honesto:** a interface foi verificada à mão no navegador e no iPhone do dono do projeto, não em
  Android nem com leitor de tela real, e não tem testes automatizados (a lógica tem 449 testes em 42 arquivos,
  em 25/11).

## Desenho: lacunas fechadas

| Lacuna encontrada | Decisão | Onde |
|---|---|---|
| Sem orçamento total de tempo na extração | `totalBudgetMs` no roteador | ARCHITECTURE §4 |
| "Hoje" em UTC erra o dia no Brasil | `Clock` em `America/Sao_Paulo` na borda | ARCHITECTURE §3 |
| Estorno e nota cancelada não modelados | Status `cancelada`, fora do acumulado | DATA-MODEL |
| Cooldown só em memória | `CooldownStore` em Postgres | ARCHITECTURE §4 |
| Autenticação e isolamento indefinidos | Perfil único de demo, RLS deny-all, acesso só pelo servidor | ARCHITECTURE §6 |
| Rastro da IA não persistido | Tabela `extractions` com versão do prompt | DATA-MODEL |
| Provedor sem declarar o que suporta | `capabilities` por adaptador | ARCHITECTURE §4 |
| Falha no e-mail perde o alerta | Gravar antes, enviar depois, `sent_at` | ARCHITECTURE §5 |
| Edição depois de confirmar | Histórico em `transaction_events` | DATA-MODEL |
| Limite fixo no código | Regras versionadas por ano | ARCHITECTURE §3 |
| Falhas sem tratamento definido | Tabela de degradação | ARCHITECTURE §7 |
| Abuso da cota gratuita | Teto diário global (`QuotaGuard`) | ARCHITECTURE §6 |
| Sem estratégia de testes | Pirâmide definida, eval em replay na CI | ARCHITECTURE §9 |

## Desenho: questões abertas (negócio)

As 5 questões sem confirmação estão em [mei-rules.md](mei-rules.md) ("O que continua sem confirmação"). As que
mudam o produto:

- [ ] Data que conta para o limite: emissão ou recebimento (**sem regra oficial achada**)
- [ ] Alíquotas para estimar o custo do estouro (o excedente usa alíquotas efetivas por anexo; o 6% segue como estimativa)

As outras três (despesas fora da receita bruta, devoluções e cancelamentos, prazo do DAS de excesso) têm decisão
provisória registrada lá e não mudam número na tela.

Resolvidas ou técnicas:

- [x] Valores atuais do limite, tolerância e DAS (confirmados em 24/11/2026; o teto sobe em 2027 e 2028 pela LC 238/2026)
- [x] Modelos dos tiers gratuitos (cadeia definida em 25/11)
- [ ] Limites exatos dos tiers gratuitos: **reaberto**. O OpenRouter gratuito tem limite diário por conta e ele
  acabou durante os testes de 25/11; o `gemini-3.6-flash` lê poucas notas por dia. Reconferir antes da gravação

## Implementação: estado atual

| Item | Estado |
|---|---|
| Regras do MEI em `src/core`, com testes unitários | ✅ |
| Roteador de extração com failover, escalonamento, cooldown (com `Retry-After`), orçamento de tempo, cota, segundo modelo em paralelo e último recurso, testado sem rede | ✅ |
| Prompt v4 (chave de acesso) e chave inválida descartada em vez de reprovar a nota | ✅ |
| CI com lint, tipos, testes e `eval` em replay (limiares 0,75 e 0,10) | ✅ |
| Fase 0: status, Clock, regras por ano, budget, capabilities, portas, validação de env, migração SQL | ✅ |
| Adaptadores Gemini e OpenRouter | ✅ (ver EVAL-RESULTS) |
| Migrações e repositórios do Supabase (perfil, documentos, extrações, transações, storage, cooldown, cota, alertas) | ✅ (`0001` e `0002` aplicadas no banco do projeto) |
| Upload (`POST /api/documents`): assinatura do arquivo, hash, limite por janela, persistência e extração (a IA lê enquanto o arquivo é gravado), testado no Supabase real | ✅ |
| Confirmação, cancelar e corrigir lançamento, histórico de alterações, painel e relatório | ✅ (lançamento e evento são dois comandos com compensação, não uma transação do banco) |
| Notas "para conferir" (status `pendente`) | ❌ nenhum fluxo grava `pendente`: a nota lida fica só na tela até ser confirmada, e o contador é sempre 0 (o Painel mostra "Tudo conferido") |
| Interface: 16 telas, abas Painel/Simular/Histórico/Mais, tema claro/escuro, ocultar valores, instalável | ✅ (quatro rodadas de revisão; sem testes automatizados de interface) |
| Extrato: CSV lido no navegador e conciliado com as receitas | ✅ (não é salvo no banco) |
| Alertas por e-mail e cron | ✅ e-mail real enviado e recebido em 25/11/2026 (chamada local ao cron, com o Resend). O cron agendado da Vercel ainda não rodou |
| Harness `eval` (26 notas), gravação/replay, casos adversariais e porta de qualidade na CI | ✅ |
| Cobertura das gravações no prompt v4: `gemini-3.5-flash-lite` 26/26, `gemini-flash-lite-latest` 26/26, Nemotron 0/26 (cota diária do OpenRouter acabou), `gemini-3.6-flash` 0/26 (cota pequena). Uma gravação por nota | 🟡 completar |
| Segurança: Origin, corpo estrito, cabeçalhos e CSP, máscara de CPF/CNPJ, limite por janela | ✅ (sem login; ver SEGURANCA.md) |
| `gitleaks` e `npm audit` na CI | ❌ só rodados à mão (`npm audit` sem vulnerabilidades de produção em 25/11) |
| Deploy público | 🟡 existe na Vercel, mas com proteção por login ligada |
| Lembrete do vencimento do DAS por e-mail | ❌ não implementado |

## Pontos bobos a eliminar antes de enviar

- [x] Página inicial ainda é a do `create-next-app` (substituída por página própria)
- [x] Imagens de exemplo do Next em `public/` (removidas)
- [x] Favicon padrão (substituído por `src/app/icon.svg`)
- [ ] Sem `LICENSE` ou aviso de licença (o regulamento só exige que não impeça
      leitura, execução e teste do código)
- [x] Sem `engines` / `.nvmrc` com a versão do Node
- [ ] README sem link da demo (a tabela de avaliação já está)
- [x] Fontes das regras do MEI registradas ([mei-rules.md](mei-rules.md)), com ressalva: limite, tolerância e DAS
      em fonte oficial; a data que conta e as alíquotas seguem sem fonte, e parte da Resolução CGSN 140 foi lida em
      cópia de terceiro
- [x] Custo do estouro sempre rotulado como estimativa na interface
- [x] Nenhuma afirmação de acerto sem número medido (o README traz o eval v4 com as ressalvas: uma gravação por
      nota, dois modelos sem gravação, 0% de revisão em parte pelo descarte da chave)
- [x] Sem `console.log`, `TODO` ou código morto (`console.log` só nos scripts de verificação)
- [x] Sem dados reais de terceiros em exemplos ou capturas de tela (tudo fictício)
- [ ] Links da demo e do vídeo testados em janela anônima, sem login

## Checklist final de envio

Mantido em [PLANO.md](PLANO.md), seção "Definição de pronto para o envio".
