# Interface

Mobile-first, no padrão visual do iOS 26, em modo claro e escuro (segue o sistema).
Ver também: [arquitetura](ARCHITECTURE.md) · [plano](PLANO.md).

## Telas

| Rota | O que faz |
|---|---|
| `/` | Painel: faturamento do ano, faixa de risco, a sala do limite, previsão, DAS, notas para conferir, receita por mês e atalho para lançar sem nota |
| `/enviar` | Escolher a nota (fotos grandes são reduzidas no aparelho), esperar a leitura, conferir os dados e confirmar |
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
- **Cada cor tem um papel, e o estado nunca vem só em cor.** Branco e cinza são o conteúdo; **azul** é o que
  se toca (botão principal, links, aba ativa); **âmbar e vermelho** são risco; **verde** é confirmação e
  "dentro do limite". O risco sempre vem com ícone e texto. A primeira versão tinha botão preto e branco;
  a revisão (com a análise de uma segunda opinião) trouxe o azul de volta, porque separar "o que eu toco" de
  "o que o app me diz" deixa a tela mais fácil de aprender.

  | Papel | Escuro | Claro |
  |---|---|---|
  | Fundo / cartão | `#000000` / `#242426` | `#f2f2f7` / `#ffffff` |
  | Texto / texto secundário | `#ffffff` / `#acacb1` | `#000000` / `#636366` |
  | Ação (botão) | `#0a84ff` | `#007aff` |
  | Ação (texto e links) | `#409cff` | `#0062cc` (passa de 4,5:1) |
  | Atenção | `#ff9f0a` | `#cc6600` |
  | Crítico (laranja-avermelhado) | `#ff6a2a` | `#e0501a` |
  | Acima do limite (vermelho) | `#ff453a` | `#d70015` |
  | Confirmação | `#30d158` | `#248a3d` |

  Regras que saíram da revisão de cores:

  - **Receita não é verde.** No Teto, receita é o que aproxima do limite; verde significaria "bom" para o número
    que traz o risco. Receita fica no branco, com `+` e seta; verde fica só para confirmação e "dentro do limite".
  - **Quatro degraus de risco**: verde, âmbar, laranja-avermelhado (Crítico, e também "Limite atingido") e
    vermelho (passou do limite). O vermelho tem ícone próprio (octógono), para quem não distingue laranja de vermelho.
  - **O pontilhado dos 20% é âmbar**, na sala e na legenda: é onde o risco começa. O telhado cheio do limite fica neutro.
  - **O laranja do tema claro não dá para ficar mais vivo.** `#cc6600` é o mais claro que ainda passa de 3:1 sobre o
    trilho (3,06); `#d96c00` dá 2,74 e `#e07000` dá 2,58. A sala do claro é mais fechada que a do escuro por isso.
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
- O Next guarda a tela anterior escondida, **com o estado**. Por isso o fluxo de envio descarta o estado ao sair
  (`SendFlow` remonta quando a tela é deixada); sem isso, "Enviar nota" trazia de volta a nota abandonada.

## Preferências do usuário

- **Tema:** Sistema, Claro ou Escuro, guardado no aparelho. Um script curto aplica a escolha antes da primeira
  pintura (sem piscar) e ajusta a cor da barra do navegador.
- **Ocultar valores:** troca os valores em dinheiro por uma barra lisa (um borrão ainda deixa adivinhar os dígitos)
  no painel, na previsão, no histórico, na simulação, na conferência e na confirmação, para abrir o app em
  público. O botão fica no cabeçalho do Painel e em Perfil. Na impressão, os valores voltam a aparecer.

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

## Perfil

Cartão do MEI (lápis para editar, só quando a edição está liberada, e o selo "Demonstração · dados fictícios"),
**Preferências** (tema e ocultar valores, guardados só no aparelho), **Seu MEI** (alertas, relatório e
exportação, regras do ano), **Ajuda** (como a IA lê, instalar no celular, primeiros passos) e, no rodapé, a
versão publicada (commit). Referência de organização: a aba "Mais" do Bolso.

## Envio de foto

Fotos acima de 1,5 MB são reduzidas no aparelho (JPEG de até ~3 MB, lado maior entre 1280 e 2000 px, que
ainda deixa o texto da nota legível). O usuário não vê limite de megabytes; só PDF acima de 4 MB é recusado,
com a saída dita ("tire uma foto da nota ou exporte um PDF menor").

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
- Teste em aparelho e com leitor de tela real (VoiceOver, TalkBack): a verificação foi por marcação e no navegador.
- Tamanho de texto dinâmico do iOS dentro do app web.
- Lembrete do vencimento do DAS por e-mail.
- Modo offline.
- Testes automatizados de interface (só a lógica tem testes). Ver [REVISAO.md](REVISAO.md).
