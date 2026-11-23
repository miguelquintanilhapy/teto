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
| Regras do MEI em `src/core` (38 testes) | ✅ |
| Roteador de extração com failover, escalonamento e cooldown (12 testes) | ✅ |
| CI com lint, tipos e testes | ✅ |
| Fase 0 (status, Clock, regras por ano, budget, capabilities, portas) | 🟡 |
| Adaptadores Gemini e OpenRouter | 🟡 |
| Migração e repositórios do Supabase | 🟡 |
| Rotas de API e validação de upload | 🟡 |
| Interface (upload, confirmação, painel, simulador) | 🟡 |
| Alertas por e-mail e cron | 🟡 |
| Harness `eval` e casos adversariais | 🟡 |
| `gitleaks` e `npm audit` na CI | 🟡 |
| Deploy público | 🟡 |

## Pontos bobos a eliminar antes de enviar

- [ ] Página inicial ainda é a do `create-next-app` (`src/app/page.tsx`)
- [ ] Imagens de exemplo do Next em `public/`
- [ ] Favicon padrão
- [ ] Sem `LICENSE` ou aviso de licença (o regulamento só exige que não impeça
      leitura, execução e teste do código)
- [ ] Sem `engines` / `.nvmrc` com a versão do Node
- [ ] README sem link da demo e sem tabela de avaliação
- [ ] Fontes das regras do MEI ainda "a confirmar"
- [ ] Custo do estouro sempre rotulado como estimativa na interface
- [ ] Nenhuma afirmação de acerto sem número medido
- [ ] Sem `console.log`, `TODO` ou código morto
- [ ] Sem dados reais de terceiros em exemplos ou capturas de tela
- [ ] Links da demo e do vídeo testados em janela anônima, sem login

## Checklist final de envio

Mantido em [PLANO.md](PLANO.md), seção "Definição de pronto para o envio".
