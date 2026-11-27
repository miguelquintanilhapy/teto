# Interface

Mobile-first, no padrão visual do iOS 26, em modo claro e escuro (segue o sistema).
Ver também: [arquitetura](ARCHITECTURE.md) · [plano](PLANO.md) · [revisão](REVISAO.md).

## Navegação

- **Quatro abas** na barra de baixo: **Painel** (`/`), **Simular** (`/simular`), **Histórico** (`/historico`) e
  **Mais** (`/perfil`), e ao lado delas um botão circular azul, **Enviar** (`/enviar`). As abas ficam em
  `src/app/(app)/` e compartilham o mesmo layout. Na troca, a cápsula da barra desliza até a aba tocada e o conteúdo
  novo entra num fundido curto, sem deslizar (ver "Animações e interação").
- **As outras telas são folhas**, abertas por cima, com um X. O X volta para a tela de origem quando ela é
  conhecida (o filtro e a rolagem continuam lá); senão vai para um destino fixo. Quem lembra a origem é o
  `NavMemory`, e quem usa é o `CloseButton` (`src/components/nav`).

## Telas

| Rota | O que faz |
|---|---|
| `/` (aba Painel) | Faturamento do ano (com centavos), faixa de risco, a sala do limite, "Lançar sem nota" logo abaixo do número, barra do limite com a faixa de tolerância, previsão, DAS com atalho "Gerar guia" (PGMEI), notas ("Tudo conferido" quando não há pendentes) e receita por mês (valor e mês ao toque) |
| `/simular` (aba Simular) | "E se eu aceitar uma venda de R$ X?", respondido enquanto o valor é digitado. Uma resposta só, em número grande (quanto ainda cabe ou quanto a venda passa do limite), com uma frase de consequência embaixo; atalhos numa linha e "Usar o que ainda cabe" junto do campo |
| `/historico` (aba Histórico) | Lançamentos mês a mês (‹ Novembro de 2026 ›, do mês de abertura ou de janeiro até hoje), com o resumo do mês (Receitas e Despesas), busca no ano todo, filtro Todos, Receitas ou Despesas guardado no endereço, o saldo de cada dia ao lado da data, a linha "Conferir extrato do banco" abaixo do resumo (leva a `/extrato`), cancelados escondidos até pedir (aparecem num grupo próprio logo abaixo do botão, onde o toque foi) e aviso de "Possível duplicidade" |
| `/perfil` (aba Mais) | Cartão do MEI, preferências (tema e ocultar valores), atalhos do MEI, ajuda e "Sobre" (a IA); a versão do app aparece com um toque |
| `/enviar` (botão Enviar) | "Tirar foto" como ação principal (ou escolher arquivo), aviso de que a imagem vai para a IA, espera da leitura, conferência e confirmação |
| `/lancar` | Lançar sem nota (também abre pré-preenchido a partir do extrato) |
| `/historico/[id]` | Detalhe: a descrição como título, por que conta (ou não) no limite, "Pela IA, conferida por você", histórico de alterações, corrigir e cancelar |
| `/extrato` | Importa o CSV do banco **no navegador** e concilia com as receitas (entradas sem nota, notas sem entrada). Lê os formatos do Inter, do Nubank e do PicPay (menos tipográfico "−", colunas "origem / destino" e "tipo"); cada entrada mostra primeiro quem pagou, e resgate de cofrinho, estorno e transferência entre contas ficam de fora, porque não são venda. Depois de ler o arquivo, a explicação vira uma linha (arquivo, período, "Trocar"), a resposta vem em número grande ("Entraram no banco sem nota"), e as listas ficam num controle segmentado (Sem nota, Sem entrada, Conferidas), agrupadas por dia. Cada entrada tem "Lançar" e "Não é receita", que a tira da lista (com "Desfazer"), então a lista encolhe conforme a pessoa confere |
| `/relatorio` | Receita mês a mês, CSV e impressão em PDF |
| `/alertas` ("Avisos do limite") | Cada faixa do limite: cruzada ou não, e-mail enviado, na fila ou aguardando configuração, com atalho para trocar o e-mail |
| `/ia` | Como a IA lê, em linguagem simples; a cadeia de modelos, a cota de hoje, tempos, falhas e o rastro de cada leitura ficam em "Detalhes técnicos" |
| `/bem-vindo` | Primeiro cadastro do MEI (CNPJ e data de abertura). Quem já tem cadastro vai direto ao Painel |
| `/perfil/editar` | Editar o cadastro (só quando a edição está liberada; ver [SEGURANCA.md](SEGURANCA.md)) |
| `/regras` | Escrita para quem nunca ouviu falar em desenquadramento: abre com "Conta tudo que entra, não o lucro", mostra a conta do limite (R$ 6.750 por mês × meses de atividade), as três faixas com o que acontece na prática e "Você está aqui", os avisos com o valor de cada um, o DAS e o que fazer se for passar ("Entenda o limite", no Painel, leva para cá) |
| `/instalar` | Como adicionar o Teto à tela inicial: no Android, botão de instalar de verdade; no iPhone, os passos com o ícone de Compartilhar |
| `/primeiros-passos` | Três passos para começar, marcados conforme o que já foi feito (passo feito não é link) |
| 404 | "Esta página saiu do ar", com a sala vazia |

"Teto" aparece só como nome do app; nos textos, o limite é "limite".

## Decisões de design

- **O telhado da marca é o medidor.** A "sala" do painel mostra quanto do limite foi ocupado; o telhado cheio
  marca o limite e o pontilhado marca o limite com 20% a mais. É um medidor de capacidade, e não um anel de
  progresso (a Apple reserva o anel para atividade). O topo do Painel mostra só o nome da tela, como nos apps de
  celular: o selo "Teto" que ficava acima do título saiu, porque, pequeno, parecia a seta de enviar.
- **A barra do limite vai até 120%.** Um traço marca o limite, a faixa da tolerância (100% a 120%) vem tingida,
  e o já faturado não encolhe quando uma simulação soma um valor; o trecho novo tem legenda
  (`src/lib/limit-geometry.ts`).
- **Cada cor tem um papel, e o estado nunca vem só em cor.** Branco e cinza são o conteúdo; **azul** é o que
  se toca (botão principal, links, aba ativa); **âmbar, laranja-avermelhado e vermelho** são risco; **verde** é
  confirmação e "dentro do limite". O risco sempre vem com ícone e texto. A primeira versão tinha botão preto e
  branco; a revisão trouxe o azul de volta, porque separar "o que eu toco" de "o que o app me diz" deixa a tela
  mais fácil de aprender.

  Tokens em `src/app/globals.css` (use as classes do Tailwind, nunca a cor solta):

  | Papel | Token | Escuro | Claro |
  |---|---|---|---|
  | Fundo / cartão | `bg` / `card` | `#000000` / `#242426` | `#f2f2f7` / `#ffffff` |
  | Texto / texto secundário | `label` / `label-2` | `#ffffff` / `#acacb1` | `#000000` / `#636366` |
  | Ação (botão, texto branco) | `primary` | `#0a6fdf` (4,83:1) | `#006ae0` (5,07:1) |
  | Ação (texto e links) | `action` | `#409cff` | `#0062cc` (passa de 4,5:1) |
  | Atenção (âmbar) | `warn` / `warn-text` | `#ff9f0a` / `#ffb340` | `#cc6600` / `#b25000` |
  | Crítico e "Limite atingido" (laranja-avermelhado) | `alert` / `alert-text` | `#ff6a2a` / `#ff8a57` | `#e0501a` / `#b4390a` |
  | Acima do limite (vermelho) | `danger` / `danger-text` | `#ff453a` / `#ff6961` | `#d70015` / `#d70015` |
  | Confirmação | `ok` / `ok-text` | `#30d158` / `#30d158` | `#248a3d` / `#1f7a34` |
  | Fundo de mesa (computador e tablet) | `--desk` | `#1c1c1e` | `#e3e3e8` |

  Regras que saíram das revisões de cor:

  - **O azul do botão passa de 4,5:1 com texto branco nos dois temas.** O azul do iOS (`#007aff` e `#0a84ff`) não
    passava; os novos dão 5,07:1 (claro) e 4,83:1 (escuro).
  - **Receita não é verde.** No Teto, receita é o que aproxima do limite; verde significaria "bom" para o número
    que traz o risco. Receita fica no branco, com `+` e seta; verde fica só para confirmação e "dentro do limite".
  - **Quatro degraus de risco**: verde, âmbar, laranja-avermelhado (Crítico, e também "Limite atingido") e
    vermelho (passou do limite). O vermelho tem ícone próprio (octógono), para quem não distingue laranja de vermelho.
  - **O pontilhado dos 20% é âmbar**, na sala e na legenda: é onde o risco começa. O telhado cheio do limite fica neutro.
    Os pontos são calculados um a um (`src/lib/roof.ts`), com um em cada ponta e um no topo, espelhados; um tracejado
    deixava o topo sem ponto e o lado direito torto. O mesmo cálculo desenha a sala, a legenda e o 404.
  - **A cota da IA não é verde**: não é confirmação de nada.
  - **O laranja do tema claro não dá para ficar mais vivo.** `#cc6600` é o mais claro que ainda passa de 3:1 sobre o
    trilho (3,06); `#d96c00` dá 2,74 e `#e07000` dá 2,58. A sala do claro é mais fechada que a do escuro por isso.
- **Uma regra só para reais inteiros: truncar.** Onde o valor aparece sem centavos, os centavos são cortados, nunca
  arredondados (`src/lib/format.ts`). Antes o Painel mostrava 56.180 e o gráfico 56.181 para o mesmo valor. O número
  grande do Painel mostra os centavos.
- **Vidro só na navegação.** Botões e barra de abas usam vidro; o conteúdo, não.
- **Ação principal ao alcance do polegar.** O botão "Enviar" fica ao lado das abas, sempre à vista.
- **Conferir antes de somar.** A IA só lê. O tipo (receita ou despesa) é decidido pelo código a partir dos
  CPF/CNPJ e só é pedido ao usuário quando o código não consegue decidir. A tela mostra o efeito no limite
  antes de confirmar. Se a chave de acesso não passou no dígito verificador, a conferência avisa que ela foi
  ignorada e que o resto foi lido.
- **Erro específico por campo**, nunca um "inválido" genérico, e uma saída sempre à vista (cancelar, preencher
  manualmente, tentar de novo). Uma voz só nas mensagens (impessoal); o botão de confirmar diz o que falta em vez
  de ficar apagado.
- **Histórico por mês, como um extrato.** A organização veio do Bolso: um mês por vez, com setas para o anterior e
  o próximo, e o resumo do mês em dois cartões (Receitas e Despesas, sem os cancelados, como no limite). O resumo
  não muda com o filtro. Cada data traz o saldo do dia (entradas menos saídas do que está na lista). O filtro é um
  controle segmentado de três opções (Todos, Receitas, Despesas) com um marcador que desliza; o antigo "Conferir"
  saiu, porque nenhum fluxo grava o status `pendente` e a lista ficava sempre vazia. Um link antigo como
  `/historico?status=pendente` abre em "Todos".
- **Busca no ano todo.** Enquanto há texto no campo, a busca vale para o ano inteiro (o seletor de mês e o resumo
  saem, e aparece "N resultados em 2026"). Ela acha pela descrição, pelo valor ("3015", "3.015" ou "3.015,00") e
  pelo documento da outra parte, sem diferenciar maiúsculas nem acentos. O documento vem mascarado do servidor, então
  só a parte visível dele é encontrada (no CNPJ, os oito primeiros dígitos, com ou sem pontos).
- **Linha enxuta.** A linha não mostra CPF/CNPJ (fica no detalhe). O título leva inicial maiúscula; sem descrição,
  o título vira o tipo (Receita ou Despesa), porque "Sem descrição" em cinza fazia a linha parecer desabilitada. O
  aviso de "Possível duplicidade" (`src/lib/duplicates.ts`) marca lançamentos com mesma data, valor, tipo, outra
  parte e descrição; é só um aviso (duas vendas iguais no mesmo dia existem), e quem decide é o usuário. A lógica do
  histórico (meses, resumo, busca e título) fica em `src/lib/history.ts`, com testes.

## Navegação fluida

- O painel é lido por `getPanel` (`src/server/panel-cache.ts`), com `"use cache"`: o servidor só volta ao banco
  a cada 30 s ou quando um lançamento é confirmado (a rota de confirmação chama `revalidateTag`). As telas o leem
  por `loadPanelSafe` (`src/server/panel-safe.ts`), que devolve um motivo (sem cadastro ou erro) para a tela
  explicar, em vez de quebrar.
- Todas as telas são pré-renderizadas e o roteador do navegador reaproveita a tela por 60 s sem pedir nada ao
  servidor. Medido em produção local: trocar de aba leva cerca de 15 ms (antes, 0,6 a 1 s por visita).
- O filtro, a busca e a troca de mês do histórico rodam no navegador, para a página continuar estática.
- Os esqueletos têm a forma do conteúdo, e não um bloco vazio.
- Limite conhecido: o cache é do perfil único de demonstração. Com várias contas, o identificador do usuário
  entra como argumento de `getPanel`.
- O Next guarda a tela anterior escondida, **com o estado**. Por isso o fluxo de envio descarta o estado ao sair
  (`SendFlow` remonta quando a tela é deixada); sem isso, "Enviar" trazia de volta a nota abandonada.

## Preferências do usuário

- **Tema:** Sistema, Claro ou Escuro, guardado no aparelho. Um script curto aplica a escolha antes da primeira
  pintura (sem piscar) e ajusta a cor da barra do navegador.
- **Ocultar valores:** troca os valores em dinheiro (classe `sensitive`) por uma barra lisa (um borrão ainda deixa
  adivinhar os dígitos) no painel, na previsão, no histórico, na simulação, na conferência e na confirmação, para
  abrir o app em público. Também some o que revelaria o valor pelo desenho: a altura da sala e o preenchimento das
  barras (classe `privacy-hide`). Partes com cor própria dentro de um valor também somem (`.sensitive *`): antes,
  os centavos do Painel ficavam à vista. O botão fica no cabeçalho do Painel e na aba Mais. Na impressão, os valores
  voltam a aparecer.

## Acessibilidade

- Texto em `rem`: acompanha o tamanho de texto do navegador e do sistema. Com texto ampliado, a sala desce para
  baixo do número em vez de espremê-lo (container query no cartão do Painel).
- Contraste medido: texto acima de 4,5:1 e gráficos acima de 3:1 nos dois modos (laranja, verde e vermelho
  mais escuros no modo claro; azul do botão com texto branco acima de 4,5:1).
- A sala, os medidores e o gráfico têm descrição em texto para leitores de tela.
- O preenchimento da sala respeita "reduzir movimento".
- Alvos de toque de 44 pt ou mais (o seletor do gráfico também), e foco visível em tudo que é interativo,
  arredondado nos campos.
- Um `h1` e um `main` por tela; título de página próprio; campos com o teclado certo (CNPJ numérico, e-mail).
- A confirmação antes de descartar uma nota lida leva o foco à saída segura e fecha com Escape.
- O que o leitor de tela anuncia na simulação espera a digitação parar.

## Layout no celular e no computador

- No iPhone, o topo tem folga depois da área segura, e uma película na cor do fundo fica sob a barra de status,
  para o conteúdo rolado não aparecer embaixo do relógio.
- No computador e no tablet (a partir de 768 px), o app continua uma coluna de celular (até 430 px), emoldurada
  com borda e sombra sobre um fundo de mesa (`--desk`), em vez de preto dos dois lados.

## Mais (perfil)

Cartão do MEI (lápis para editar, só quando a edição está liberada, e o selo "Demonstração · dados fictícios"),
**Preferências** (tema e ocultar valores, guardados só no aparelho), **Seu MEI** (avisos do limite, relatório e
exportação, regras do ano), **Ajuda** (instalar no celular, primeiros passos), **Sobre** (como a IA lê) e a versão
publicada (commit), que aparece com um toque em "Teto", no rodapé. Referência de organização: a aba "Mais" do Bolso.

## Envio de foto

Fotos acima de 1,5 MB são reduzidas no aparelho (JPEG de até ~3 MB, lado maior entre 1280 e 2000 px, que
ainda deixa o texto da nota legível). O usuário não vê limite de megabytes; só PDF acima de 4 MB é recusado,
com a saída dita ("tire uma foto da nota ou exporte um PDF menor"). O envio aceita foto e PDF, não XML.

## Fonte e ícones

- Fonte do sistema primeiro (SF Pro no iPhone e no Mac), com Inter de reserva nos demais.
- Ícones: [Phosphor](https://phosphoricons.com) (MIT). Os SF Symbols não são usados porque a licença da Apple
  restringe o uso às plataformas Apple; dá para trocar depois.

## Dados e núcleo

As telas não calculam regra de negócio. Elas leem o painel (`loadPanelSafe` → `getPanel` → `loadPanel`, em
`src/server`), que usa o núcleo (`src/core`), e só escrevem o resultado em português (`src/lib/copy.ts`,
`src/lib/simulate.ts`). Os valores de custo do estouro são sempre rotulados como estimativa.

Linguagem das regras: a consequência vem antes do termo técnico ("vira microempresa em 1º de janeiro", "deixa de ser
MEI desde a abertura"), e não "é desenquadrado". As frases de estouro saem de um lugar só (`toleranceConsequence`,
`retroactiveConsequence` e `retroactiveSince`, em `src/lib/copy.ts`), usadas no Simular, na Previsão, nos avisos e no
e-mail. No ano de abertura, a saída acima de 20% vale desde a abertura, não desde janeiro.

## Animações e interação

Discretas e sempre atrás de `prefers-reduced-motion: no-preference`: entrada suave das folhas, estado de toque
(`:active`), barras do gráfico crescendo em sequência, a sala enchendo, o visto da confirmação com o telhado
se desenhando. `:hover` só existe onde há mouse.

A sala e o gráfico só animam **na primeira visita da sessão**; depois aparecem prontos (animar a cada troca de
aba cansava). Na troca de aba, a cápsula da barra desliza até a aba tocada (curva de mola do iOS, 0,42 s, com uma
leve esticada no caminho) e sai no toque, sem esperar a tela carregar; o conteúdo novo entra num fundido de 0,18 s,
sem deslizar, como no iOS (`TabBar` e `TabContent`, em `src/components`).

A troca de tema imita o iPhone: a tela inteira se dissolve de uma aparência para a outra em 0,4 s
(View Transitions API, com um fundido de cores por CSS onde ela não existe), e o marcador do seletor
desliza de uma opção à outra (o filtro do Histórico usa o mesmo marcador). Com "reduzir movimento", a troca é
instantânea.

## O que ainda não existe

- Autenticação e vários MEIs (ver [SEGURANCA.md](SEGURANCA.md)).
- Notas "para conferir": nenhum fluxo grava o status `pendente`, então o Painel sempre mostra "Tudo conferido". O
  filtro "Conferir" saiu do histórico por isso; o código ainda trata `pendente` no cartão de Notas do Painel (que
  leva a `/historico?status=pendente`, hoje aberto em "Todos"), no selo da linha do histórico, no detalhe e no
  relatório, para quando esse status passar a ser gravado.
- Teste em Android e com leitor de tela real (VoiceOver, TalkBack). Houve teste no iPhone do dono do projeto.
- Tamanho de texto dinâmico do iOS dentro do app web.
- Lembrete do vencimento do DAS por e-mail.
- Modo offline.
- Testes automatizados de interface (só a lógica tem testes). Ver [REVISAO.md](REVISAO.md).
