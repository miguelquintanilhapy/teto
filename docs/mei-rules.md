# Regras do MEI usadas pelo Teto

Consulta feita em **24/11/2026**, para o ano-calendário de **2026**. A coluna "Situação" diz
o quanto cada regra está confirmada:

- **Confirmado**: lido em fonte oficial (Planalto, Receita).
- **Parcial**: só em fonte secundária (cópia de norma de terceiros, notícia) ou só em parte.
- **Não encontrado**: a pesquisa não achou fonte para o ponto.

> **Limites da pesquisa.** Várias páginas do gov.br (Portal do Empreendedor e Receita) devolveram
> CAPTCHA e não puderam ser lidas. A Resolução CGSN 140/2018 foi lida só numa cópia de terceiro
> (a página oficial não carregou). O "Perguntão MEI" da Receita é de 29/04/2025. O Teto não
> substitui um contador: confira com um profissional antes de decisões fiscais.

## Regras confirmadas

| Regra | Como o Teto trata | Onde está no código | Situação | Fonte |
|---|---|---|---|---|
| Limite anual de receita bruta em **2026** | R$ 81.000 | `rulesFor(2026)` | **Confirmado** | LC 123/2006, art. 18-A, §1º ([Planalto](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm)); [página do Ministério](https://www.gov.br/memp/pt-br/teto-do-mei) |
| Limite em **2027** e **2028 em diante** | R$ 110.000 em 2027 e R$ 140.000 a partir de 2028. Condicionado à previsão de renúncia de receita nas leis orçamentárias de 2027 a 2029 (art. 3º) | `RULES_BY_YEAR` | **Confirmado** | LC 238/2026, de 21/10/2026, arts. 2º, 3º e 10 ([Planalto](https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp238.htm)) |
| Ano de abertura | Limite proporcional: R$ 6.750 × meses entre o início da atividade e 31/12; **fração de mês conta como mês inteiro**, então o mês de abertura conta inteiro. Em 2027: R$ 9.166,67 por mês. A partir de 2028: R$ 11.666,67 por mês | `annualLimitFor` | **Confirmado** | LC 123, art. 18-A, §2º; Resolução CGSN 140, art. 100, §1º; [Perguntão MEI](https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/PerguntaoMEI.pdf), pergunta 6.4 |
| Estouro de até 20% (R$ 97.200 para 81 mil) | O MEI **continua enquadrado no ano** do excesso e é desenquadrado em 1º de janeiro do ano seguinte. Deve comunicar o desenquadramento até o último dia útil do mês seguinte ao do excesso. O excedente é tributado com as alíquotas efetivas do Simples Nacional (Anexos I a V da LC 123) | `classifyRisk` → `over_tolerance` | **Confirmado** (lei); detalhes da Resolução: **Parcial** | LC 123, art. 18-A, §7º, III "a" e IV "a", e §10; Resolução CGSN 140, art. 115; Perguntão, perguntas 6.4 e 6.8 |
| Estouro acima de 20% | Desenquadramento **retroativo a 1º de janeiro** do ano do excesso (no ano de abertura, ao início da atividade). As diferenças são pagas com encargos legais | `classifyRisk` → `over_retroactive` | **Confirmado** (efeito retroativo); cálculo e multa: **Parcial** | LC 123, art. 18-A, §7º, III "b" e IV "b"; Resolução CGSN 140, art. 115, §9º e art. 117 (cópia de terceiro; multa de R$ 50 pela falta de comunicação) |
| Valor do DAS-MEI em 2026 | 5% do salário mínimo (R$ 1.621,00) = **R$ 81,05**, mais R$ 1,00 de ICMS (comércio/indústria) e/ou R$ 5,00 de ISS (serviços). Totais: R$ 82,05, R$ 86,05 ou R$ 87,05 (soma das parcelas) | a implementar (`dasMonthlyCents`) | **Confirmado** (valor) | [Notícia da Receita](https://www8.receita.fazenda.gov.br/simplesnacional/Noticias/NoticiaCompleta.aspx%3Fid%3Dc3b2044c-ff97-432a-b33c-ecf2a3df6dc3); Decreto nº 12.797/2025 (salário mínimo); LC 123, art. 18-A, §3º, V |
| Vencimento do DAS | Dia 20 de cada mês, configurável | `nextDasDueDate` | **Parcial**: o dia 20 apareceu na [Agência Brasil](https://agenciabrasil.ebc.com.br/economia/noticia/2026-01/recolhimento-do-mei-sobe-para-r-8105-em-2026), mas a página oficial lida não informa a data | — |
| Nota fiscal | Dispensada para venda a pessoa física. **Obrigatória para pessoa jurídica**, salvo se o destinatário emitir nota de entrada | texto do produto | **Confirmado** | Perguntão, perguntas 3.6 e 3.7; Resolução CGSN 140, art. 106 |
| Relatório Mensal de Receitas Brutas | É obrigação **manter** o relatório (Anexo X), com as notas anexadas; o MEI só o **apresenta se o Fisco pedir**. O faturamento do mês é informado até o dia 20 do mês seguinte | futuro relatório em PDF | **Confirmado** (obrigação de manter e prazo); campos exatos: **Não encontrado** | Perguntão, pergunta 3.6; Resolução CGSN 140, art. 106, I; [gov.br](https://www.gov.br/pt-br/servicos/baixar-relatorio-mensal-de-receitas-brutas) |
| MEI caminhoneiro | Fora do escopo: limite de R$ 251.600 (art. 18-F) | — | **Confirmado** (não alterado pela LC 238, segundo a página lida) | LC 123, art. 18-F |

## O que continua sem confirmação

| # | Questão | Efeito no produto | Decisão provisória |
|---|---|---|---|
| 1 | O limite considera a data de **emissão** ou de **recebimento**? **Não achei regra oficial específica do MEI**, nem se o MEI pode escolher. Há indício de que a base mensal do Simples admite caixa ou competência (Resolução CGSN 140, arts. 16 a 19, cópia de terceiro), mas isso não responde ao limite do MEI. | Define a que ano pertence uma nota de dezembro paga em janeiro | Campo único `transactions.date`; por padrão, a emissão para notas e a data do crédito para Pix. A decisão não exige mudar o núcleo. **Confirmar na Resolução CGSN 140 oficial** (idAto 92278 em normas.receita.fazenda.gov.br) ou com um contador |
| 2 | Despesas ficam fora da receita bruta? Não achei o trecho oficial; o conceito geral de receita bruta é de venda e serviço prestado | O Teto só soma receitas | Mantém: só receita entra no acumulado |
| 3 | Devoluções e cancelamentos reduzem a receita? Para o Simples em geral, a Resolução 140 (arts. 17 e 18, cópia de terceiro) deduz devolução no mês dela e nota cancelada no período original | Status `cancelada` fora do acumulado | Mantém; confirmar a aplicação específica ao MEI |
| 4 | Prazo exato de pagamento do **DAS de excesso** | Só texto do alerta | Não afirmar uma data no produto |
| 5 | Alíquotas reais para estimar o custo do estouro: o excedente usa **alíquotas efetivas por anexo**, não um percentual único | Muda o valor do simulador | O placeholder de 6% é só aproximação e fica sempre rotulado como **estimativa** |

## O que isso muda no Teto

1. **Os limites de 2027 e 2028** passaram a existir na configuração por ano (`RULES_BY_YEAR`), e a regra vale
   para os anos seguintes até a lei mudar. A ampliação depende de previsão orçamentária, então o
   produto deve tratar 2027 em diante como **"previsto em lei, condicionado"**.
2. **O DAS** pode mostrar o valor mensal (R$ 82,05, R$ 86,05 ou R$ 87,05) no lembrete, mas depende de
   saber a atividade do MEI (comércio, serviço ou ambos): campo a acrescentar ao perfil.
3. **O Relatório Mensal** deve ser apresentado como "manter e apresentar se solicitado", e não como
   entrega obrigatória ao Fisco.
4. **O texto do alerta de estouro até 20%** deve dizer que o MEI segue enquadrado no ano, mas será
   desenquadrado em janeiro e paga o excedente.

## Fora do escopo

- Categorias com limite diferente (MEI caminhoneiro).
- Cálculo oficial do DAS de excesso e do Simples Nacional.
- Emissão de notas e integração com a Receita.

## Convenções

- Todo dinheiro é inteiro em **centavos**. Nunca usamos `float` para valores.
- Datas são `YYYY-MM-DD`. O "hoje" é calculado na borda do sistema em `America/Sao_Paulo` e passado
  ao núcleo por parâmetro.
- Só transações com status **`confirmada`** entram nos cálculos.
- A regra muda por lei: a configuração é **versionada por ano**, e cada ano herda do anterior.
