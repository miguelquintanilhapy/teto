# Auditoria de qualidade do Teto

Registro honesto, separado em **desenho** (o que está decidido) e **implementação**
(o que existe em código). Atualizar a cada marco. Última revisão: 25/11/2026.

## Veredito

- **Desenho:** completo para o escopo do hackathon. As lacunas foram fechadas em
  decisões registradas em [ARCHITECTURE.md](ARCHITECTURE.md) e
  [DATA-MODEL.md](DATA-MODEL.md). Restam **2 questões de negócio** que dependem de
  fonte oficial ([mei-rules.md](mei-rules.md)).
- **Implementação:** o produto existe de ponta a ponta (enviar nota, conferir, confirmar, painel,
  simulador, histórico, extrato, relatório, alertas) e foi revisado em UX, acessibilidade, segurança e cor
  ([REVISAO.md](REVISAO.md), [SEGURANCA.md](SEGURANCA.md)). Falta o que depende de ação fora do código:
  link público e vídeo. O que sobra está em [PLANO.md](PLANO.md).
- **Limite honesto:** a interface foi verificada à mão no navegador, não em aparelho nem com leitor de tela
  real, e não tem testes automatizados (a lógica tem 406).

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

- [ ] Data que conta para o limite: emissão ou recebimento (**sem regra oficial achada**; ver mei-rules.md)
- [x] Valores atuais do limite, tolerância e DAS (confirmados em 24/11/2026; o teto sobe em 2027 e 2028 pela LC 238/2026)
- [ ] Alíquotas para estimar o custo do estouro (o excedente usa alíquotas efetivas por anexo; o 6% segue como estimativa)
- [x] Modelos e limites exatos dos tiers gratuitos (modelos definidos; limites lidos do painel, a reconferir)

## Implementação: estado atual

| Item | Estado |
|---|---|
| Regras do MEI em `src/core`, com testes unitários | ✅ |
| Roteador de extração com failover, escalonamento, cooldown, orçamento de tempo e cota, testado sem rede | ✅ |
| CI com lint, tipos, testes e `eval` em replay | ✅ |
| Fase 0: status, Clock, regras por ano, budget, capabilities, portas, validação de env, migração SQL | ✅ |
| Adaptadores Gemini e OpenRouter | ✅ (ver EVAL-RESULTS) |
| Migrações e repositórios do Supabase (perfil, documentos, extrações, transações, storage, cooldown, cota, alertas) | ✅ (`0001` e `0002` aplicadas no banco do projeto) |
| Upload (`POST /api/documents`): assinatura do arquivo, hash, limite por janela, persistência e extração, testado no Supabase real | ✅ |
| Confirmação, cancelar e corrigir lançamento, histórico de alterações, painel e relatório | ✅ |
| Interface: 16 telas, tema claro/escuro, ocultar valores, instalável | ✅ (sem testes automatizados de interface) |
| Extrato: CSV lido no navegador e conciliado com as receitas | ✅ (não é salvo no banco) |
| Alertas por e-mail e cron | ✅ testado com envio simulado; nenhum e-mail real foi enviado |
| Harness `eval` (26 notas), gravação/replay, casos adversariais e porta de qualidade na CI | ✅ |
| Cobertura das gravações: Flash-Lite 12/26, Nemotron 14/26, Flash 0/26 (sobrecarga do Google e cotas) | 🟡 completar |
| Segurança: Origin, corpo estrito, cabeçalhos e CSP, máscara de CPF/CNPJ, limite por janela | ✅ (sem login; ver SEGURANCA.md) |
| `gitleaks` e `npm audit` na CI | ✅ `npm audit --omit=dev --audit-level=high` no job `check`; `gitleaks` no histórico inteiro, job `secrets` |
| Deploy público | 🟡 existe na Vercel, mas com proteção por login ligada |
| Lembrete do vencimento do DAS por e-mail | ❌ não implementado |

## Pontos bobos a eliminar antes de enviar

- [x] Página inicial ainda é a do `create-next-app` (substituída por página própria)
- [x] Imagens de exemplo do Next em `public/` (removidas)
- [x] Favicon padrão (substituído por `src/app/icon.svg`)
- [x] Sem `LICENSE` ou aviso de licença (agora MIT; o regulamento só exige que não impeça
      leitura, execução e teste do código)
- [x] Sem `engines` / `.nvmrc` com a versão do Node
- [ ] README sem link da demo (a tabela de avaliação já está)
- [ ] Fontes das regras do MEI ainda "a confirmar"
- [x] Custo do estouro sempre rotulado como estimativa na interface
- [x] Nenhuma afirmação de acerto sem número medido (o README traz o eval com a ressalva das gravações parciais)
- [x] Sem `console.log`, `TODO` ou código morto (`console.log` só nos scripts de verificação)
- [x] Sem dados reais de terceiros em exemplos ou capturas de tela (tudo fictício)
- [ ] Links da demo e do vídeo testados em janela anônima, sem login

## Checklist final de envio

Mantido em [PLANO.md](PLANO.md), seção "Definição de pronto para o envio".
