# Regras do MEI usadas pelo Teto

> **Status: a confirmar.** Estas são as regras como a equipe as entende. Antes da
> entrega, confirmar cada item no Portal do Empreendedor / Receita Federal e
> preencher a coluna "Fonte" com o link e a data da consulta. **Prazo: 24/11.**

| Regra | Como o Teto trata | Onde está no código | Fonte |
|---|---|---|---|
| Limite anual de receita bruta | R$ 81.000, **configurável por ano** | `src/core/config.ts` → `rulesFor(year)` | a confirmar |
| Ano de abertura | Limite proporcional: limite ÷ 12 × meses ativos; o mês de abertura conta inteiro (R$ 6.750 por mês) | `annualLimitFor` | a confirmar |
| Estouro até 20% | Desenquadramento no ano seguinte; DAS sobre o excedente | `classifyRisk` → `over_tolerance` | a confirmar |
| Estouro acima de 20% | Desenquadramento retroativo ao início do ano | `classifyRisk` → `over_retroactive` | a confirmar |
| O que conta para o limite | **Só receita bruta**; despesas não entram | `accumulatedRevenue` | a confirmar |
| Vencimento do DAS | Dia 20 de cada mês, **configurável** | `nextDasDueDate` | a confirmar |

## Questões em aberto (decidir com fonte oficial)

| # | Questão | Efeito no produto | Decisão provisória |
|---|---|---|---|
| 1 | O limite considera a data de **emissão** ou de **recebimento**? | Define a que ano pertence uma nota de dezembro paga em janeiro | Campo único `transactions.date`; por padrão usa a emissão para notas e a data do crédito para Pix. A decisão não exige mudar o núcleo. |
| 2 | Como tratar estorno, devolução e nota cancelada? | Não podem continuar somando | Transação com status `cancelada`, excluída do acumulado |
| 3 | Valores atuais do limite, da tolerância e do DAS | Entram na configuração | Valores acima, configuráveis |
| 4 | Alíquotas reais para estimar o custo do estouro | Mudam o valor exibido no simulador | Placeholder de 6%, sempre rotulado como **estimativa** |

## Custos são estimativas

O custo do estouro (`estimateOverrunCost`) usa alíquotas **placeholder**
(`excessTaxRate`, `retroactiveTaxRate`). Na interface, qualquer valor monetário
de custo aparece rotulado como **estimativa**, nunca como cálculo oficial. O Teto
não substitui um contador.

## Fora do escopo

- Categorias com limite diferente (por exemplo, MEI caminhoneiro).
- Cálculo oficial do DAS e do Simples Nacional.
- Emissão de notas e integração com a Receita.

## Convenções

- Todo dinheiro é inteiro em **centavos**. Nunca usamos `float` para valores.
- Datas são `YYYY-MM-DD`. O "hoje" é calculado na borda do sistema em
  `America/Sao_Paulo` e passado ao núcleo por parâmetro.
- Só transações com status **`confirmada`** entram nos cálculos.
- A regra muda por lei: a configuração é **versionada por ano**.
