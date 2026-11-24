# Auditoria de qualidade do Teto

Registro honesto, separado em **desenho** (o que está decidido) e **implementação**
(o que existe em código). Atualizar a cada marco. Última revisão: 23/11/2026.

## Veredito

- **Desenho:** completo para o escopo do hackathon. As lacunas foram fechadas em
  decisões registradas em [ARCHITECTURE.md](ARCHITECTURE.md) e
  [DATA-MODEL.md](DATA-MODEL.md). Restam **4 questões de negócio** que dependem de
  fonte oficial ([mei-rules.md](mei-rules.md)).
- **Implementação:** a base está pronta (núcleo e roteador testados). O produto de
  ponta a ponta ainda não existe. O cronograma está em [PLANO.md](PLANO.md).

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

- [ ] Data que conta para o limite: emissão ou recebimento
- [ ] Valores atuais do limite, tolerância e DAS
- [ ] Alíquotas para estimar o custo do estouro
- [ ] Modelos e limites exatos dos tiers gratuitos

## Implementação: estado atual

| Item | Estado |
|---|---|
| Regras do MEI em `src/core`, com testes unitários | ✅ |
| Roteador de extração com failover, escalonamento, cooldown, orçamento de tempo e cota, testado sem rede | ✅ |
| CI com lint, tipos e testes | ✅ |
| Fase 0: status, Clock, regras por ano, budget, capabilities, portas, validação de env, migração SQL | ✅ (falta a porta `Notifier` e aplicar a migração no Supabase) |
| Adaptadores Gemini e OpenRouter | ✅ (Gemini confirmado ao vivo em parte; ver EVAL-RESULTS) |
| Migração e repositórios do Supabase (perfil, documentos, extrações, storage, cooldown, cota) | ✅ transações ainda 🟡 |
| Upload (`POST /api/documents`): validação por assinatura do arquivo, hash, persistência e extração, testado ponta a ponta no Supabase real | ✅ demais rotas 🟡 |
| Interface (upload, confirmação, painel, simulador) | 🟡 |
| Alertas por e-mail e cron | 🟡 |
| Harness `eval` (26 notas), gravação/replay, casos adversariais e porta de qualidade na CI | ✅ |
| Cobertura das gravações: Flash-Lite 12/26, Nemotron 14/26, Flash 0/26 (sobrecarga do Google e cotas) | 🟡 completar nos próximos dias |
| `gitleaks` e `npm audit` na CI | 🟡 |
| Deploy público | 🟡 |

## Pontos bobos a eliminar antes de enviar

- [x] Página inicial ainda é a do `create-next-app` (substituída por página própria)
- [x] Imagens de exemplo do Next em `public/` (removidas)
- [x] Favicon padrão (substituído por `src/app/icon.svg`)
- [ ] Sem `LICENSE` ou aviso de licença (o regulamento só exige que não impeça
      leitura, execução e teste do código)
- [x] Sem `engines` / `.nvmrc` com a versão do Node
- [ ] README sem link da demo e sem tabela de avaliação
- [ ] Fontes das regras do MEI ainda "a confirmar"
- [ ] Custo do estouro sempre rotulado como estimativa na interface
- [ ] Nenhuma afirmação de acerto sem número medido
- [ ] Sem `console.log`, `TODO` ou código morto
- [ ] Sem dados reais de terceiros em exemplos ou capturas de tela
- [ ] Links da demo e do vídeo testados em janela anônima, sem login

## Checklist final de envio

Mantido em [PLANO.md](PLANO.md), seção "Definição de pronto para o envio".
