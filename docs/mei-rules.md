# Regras do MEI usadas pelo Teto

> **Status: a confirmar.** Estas são as regras como a equipe as entende. Antes da
> entrega, confirmar cada item no Portal do Empreendedor / Receita Federal e
> registrar a fonte e a data da consulta na coluna "Fonte".

| Regra | Como o Teto trata | Onde está no código | Fonte |
|---|---|---|---|
| Limite anual de receita bruta | R$ 81.000, **configurável** | `src/core/config.ts` | a confirmar |
| Ano de abertura | Limite proporcional: limite ÷ 12 × meses ativos; o mês de abertura conta inteiro (R$ 6.750 por mês) | `annualLimitFor` | a confirmar |
| Estouro até 20% | Desenquadramento no ano seguinte; DAS sobre o excedente | `classifyRisk` → `over_tolerance` | a confirmar |
| Estouro acima de 20% | Desenquadramento retroativo ao início do ano | `classifyRisk` → `over_retroactive` | a confirmar |
| O que conta para o limite | **Só receita bruta**; despesas não entram | `accumulatedRevenue` | a confirmar |
| Vencimento do DAS | Dia 20 de cada mês, **configurável** | `nextDasDueDate` | a confirmar |

## Custos são estimativas

O custo do estouro (`estimateOverrunCost`) usa alíquotas **placeholder**
(`excessTaxRate`, `retroactiveTaxRate`). Na interface, qualquer valor monetário
de custo deve aparecer rotulado como **estimativa**, nunca como cálculo oficial.
O Teto não substitui um contador.

## Convenções

- Todo dinheiro é inteiro em **centavos**. Nunca usamos `float` para valores.
- Datas são `YYYY-MM-DD` calculadas em UTC, sem dependência de fuso.
- Só receitas **confirmadas** pelo usuário entram nos cálculos.
