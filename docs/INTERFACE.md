# Interface

Mobile-first, no padrão visual do iOS 26, em modo claro e escuro (segue o sistema).
Ver também: [arquitetura](ARCHITECTURE.md) · [plano](PLANO.md).

## Telas

| Rota | O que faz |
|---|---|
| `/` | Painel: faturamento do ano, faixa de risco, a sala do limite, previsão, DAS, notas para conferir e receita por mês |
| `/enviar` | Escolher a nota, esperar a leitura, conferir os dados e confirmar |
| `/simular` | "E se eu aceitar uma venda de R$ X?", respondido enquanto o valor é digitado |
| `/historico` | Lançamentos do ano agrupados por dia, com filtros |
| `/perfil` | MEI, limite proporcional e regras do ano |

## Decisões de design

- **O telhado da marca é o medidor.** A "sala" do painel mostra quanto do limite foi ocupado; o telhado cheio
  marca o limite e o pontilhado marca o limite com 20% a mais. É um medidor de capacidade, e não um anel de
  progresso (a Apple reserva o anel para atividade).
- **A cor é o estado, e nunca vem sozinha.** A marca é preto e branco; a única cor viva é a da faixa de risco
  (verde, âmbar, vermelho), sempre com ícone e texto.
- **Vidro só na navegação.** Botões e barra de abas usam vidro; o conteúdo, não.
- **Ação principal ao alcance do polegar.** "Enviar nota" fica escrito por extenso na barra flutuante.
- **Conferir antes de somar.** A IA só lê. O tipo (receita ou despesa) é decidido pelo código a partir dos
  CPF/CNPJ e só é pedido ao usuário quando o código não consegue decidir. A tela mostra o efeito no limite
  antes de confirmar.
- **Erro específico por campo**, nunca um "inválido" genérico, e uma saída sempre à vista (cancelar, preencher
  manualmente, tentar de novo).

## Navegação fluida

- O painel é lido por `getPanel` (`src/server/panel-cache.ts`), com `"use cache"`: o servidor só volta ao banco
  a cada 30 s ou quando um lançamento é confirmado (a rota de confirmação chama `revalidateTag`).
- Todas as telas são pré-renderizadas e o roteador do navegador reaproveita a tela por 60 s sem pedir nada ao
  servidor. Medido em produção local: trocar de aba leva cerca de 15 ms (antes, 0,6 a 1 s por visita).
- O filtro do histórico roda no navegador, para a página continuar estática.
- Os esqueletos têm a forma do conteúdo, e não um bloco vazio.
- Limite conhecido: o cache é do perfil único de demonstração. Com várias contas, o identificador do usuário
  entra como argumento de `getPanel`.

## Acessibilidade

- Texto em `rem`: acompanha o tamanho de texto do navegador e do sistema.
- Contraste medido: texto acima de 4,5:1 e gráficos acima de 3:1 nos dois modos (laranja, verde e vermelho
  mais escuros no modo claro).
- A sala, os medidores e o gráfico têm descrição em texto para leitores de tela.
- O preenchimento da sala respeita "reduzir movimento".
- Alvos de toque de 44 pt ou mais.

## Fonte e ícones

- Fonte do sistema primeiro (SF Pro no iPhone e no Mac), com Inter de reserva nos demais.
- Ícones: [Phosphor](https://phosphoricons.com) (MIT). Os SF Symbols não são usados porque a licença da Apple
  restringe o uso às plataformas Apple; dá para trocar depois.

## Dados e núcleo

As telas não calculam regra de negócio. Elas leem `loadPanel` (`src/server/panel.ts`), que usa o núcleo
(`src/core`), e só escrevem o resultado em português (`src/lib/copy.ts`, `src/lib/simulate.ts`).
Os valores de custo do estouro são sempre rotulados como estimativa.

## O que ainda não existe

- Cancelar ou corrigir um lançamento já confirmado.
- Importar extrato e conciliar.
- Alertas por e-mail.
