# Interface

Mobile-first, no padrão visual do iOS 26, em modo claro e escuro (segue o sistema).
Ver também: [arquitetura](ARCHITECTURE.md) · [plano](PLANO.md).

## Telas

| Rota | O que faz |
|---|---|
| `/` | Painel: faturamento do ano, faixa de risco, a sala do limite, previsão, DAS, notas para conferir, receita por mês e atalho para lançar sem nota |
| `/enviar` | Escolher a nota, esperar a leitura, conferir os dados e confirmar |
| `/lancar` | Lançar sem nota (também abre pré-preenchido a partir do extrato) |
| `/simular` | "E se eu aceitar uma venda de R$ X?", respondido enquanto o valor é digitado |
| `/historico` | Lançamentos do ano por dia, com filtros guardados no endereço |
| `/historico/[id]` | Detalhe: por que conta (ou não) no limite, histórico de alterações, corrigir e cancelar |
| `/extrato` | Importa o CSV do banco **no navegador** e concilia com as receitas (entradas sem nota, notas sem entrada) |
| `/relatorio` | Receita mês a mês, CSV e impressão em PDF |
| `/alertas` | Cada faixa do limite: cruzada ou não, e-mail enviado, na fila ou aguardando configuração |
| `/ia` | Transparência da IA: cadeia de modelos, cota de hoje, tempos, falhas e o rastro de cada leitura |
| `/perfil`, `/perfil/editar`, `/bem-vindo` | Perfil do MEI (lápis para editar), preferências (tema e ocultar valores), atalhos e versão do app |
| `/regras` | As faixas do limite, os alertas e o vencimento do DAS, em linguagem simples |
| `/instalar` | Como adicionar o Teto à tela inicial (iPhone e Android) |
| `/primeiros-passos` | Três passos para começar, marcados conforme o que já foi feito |

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

## Preferências do usuário

- **Tema:** Sistema, Claro ou Escuro, guardado no aparelho. Um script curto aplica a escolha antes da primeira
  pintura (sem piscar) e ajusta a cor da barra do navegador.
- **Ocultar valores:** troca os valores em dinheiro por uma barra lisa (um borrão ainda deixa adivinhar os dígitos) (painel, previsão, histórico, simulação, conferência e
  confirmação) para abrir o app em público. O botão fica no cabeçalho do Painel e em Perfil.

## Acessibilidade

- Texto em `rem`: acompanha o tamanho de texto do navegador e do sistema.
- Contraste medido: texto acima de 4,5:1 e gráficos acima de 3:1 nos dois modos (laranja, verde e vermelho
  mais escuros no modo claro).
- A sala, os medidores e o gráfico têm descrição em texto para leitores de tela.
- O preenchimento da sala respeita "reduzir movimento".
- Alvos de toque de 44 pt ou mais, e foco visível em tudo que é interativo.
- Um `h1` e um `main` por tela; título de página próprio; campos com o teclado certo (CNPJ numérico, e-mail).
- A confirmação antes de descartar uma nota lida leva o foco à saída segura e fecha com Escape.
- O que o leitor de tela anuncia na simulação espera a digitação parar.

## Fonte e ícones

- Fonte do sistema primeiro (SF Pro no iPhone e no Mac), com Inter de reserva nos demais.
- Ícones: [Phosphor](https://phosphoricons.com) (MIT). Os SF Symbols não são usados porque a licença da Apple
  restringe o uso às plataformas Apple; dá para trocar depois.

## Dados e núcleo

As telas não calculam regra de negócio. Elas leem `loadPanel` (`src/server/panel.ts`), que usa o núcleo
(`src/core`), e só escrevem o resultado em português (`src/lib/copy.ts`, `src/lib/simulate.ts`).
Os valores de custo do estouro são sempre rotulados como estimativa.

## Animações e interação

Discretas e sempre atrás de `prefers-reduced-motion: no-preference`: entrada suave de tela, estado de toque
(`:active`), barras do gráfico crescendo em sequência, a sala enchendo, o visto da confirmação com o telhado
se desenhando. `:hover` só existe onde há mouse.

A troca de tema imita o iPhone: a tela inteira se dissolve de uma aparência para a outra em 0,4 s
(View Transitions API, com um fundido de cores por CSS onde ela não existe), e o marcador do seletor
desliza de uma opção à outra. Com "reduzir movimento", a troca é instantânea.

## O que ainda não existe

- Autenticação e vários MEIs (ver [SEGURANCA.md](SEGURANCA.md)).
- Lembrete do vencimento do DAS por e-mail.
- Modo offline.
- Testes automatizados de interface (só a lógica tem testes). Ver [REVISAO.md](REVISAO.md).
