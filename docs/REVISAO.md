# Revisão de UX, acessibilidade e segurança

Quatro rodadas. A primeira, em 24/11/2026, por dois revisores independentes (cada um leu o código sem a conclusão
do outro) mais verificação no navegador em modo de produção; a segunda, uma auditoria externa por gravação de tela;
a terceira, em 25/11, a partir do uso real no navegador e no iPhone; a quarta, em 25/11, uma auditoria de design
independente. Depois delas, em 26/11 e 27/11, vieram ajustes a partir do uso (últimas seções). Este documento diz **o que
achamos, o que foi corrigido e o que ficou**. Ver
[SEGURANCA.md](SEGURANCA.md) e [INTERFACE.md](INTERFACE.md).

## Primeira rodada: revisão de código e navegador (24/11)

### Como foi verificado

- Os testes automatizados da época (núcleo, serviços, handlers HTTP, helpers de interface).
- Build de produção e servidor de produção: troca de aba medida em 11 a 21 ms.
- Requisições hostis contra o servidor real: origem de outro site (`403`), `text/plain` (`415`), edição do
  cadastro em produção (`403`), cron sem segredo (`401`), CPF mascarado na API.
- Console do navegador: sem violação de CSP e sem erro de hidratação.
- Modo claro e escuro, 375 px de largura, teclado e leitor de tela (por marcação, não com leitor real).

### Segurança

| Achado | Gravidade | Situação |
|---|---|---|
| Qualquer pessoa trocava CNPJ, abertura e e-mail do perfil (`PUT /api/profile`) | Alta | **Corrigido**: em produção só o primeiro cadastro é livre |
| CPF/CNPJ da outra parte e chave de acesso saíam inteiros pela API e no payload da tela | Alta | **Corrigido**: mascarado no servidor |
| Upload sem teto: enchia o storage e a cota de IA | Alta | **Mitigado**: 30 novos por 10 min, 4 MB, cota diária. Falta rate limit por IP |
| Dois toques em "Confirmar" criavam o lançamento em dobro | Média | **Corrigido**: índice único (migração 0002) e tratamento da corrida |
| O cliente podia impor "despesa" numa nota em que o MEI é o emissor | Média | **Corrigido**: `422 direction_conflict` |
| Nome do MEI com link ia parar no e-mail de alerta (phishing) | Média | **Corrigido**: nome sem link nem e-mail |
| Sem cabeçalhos de segurança nem CSP | Baixa | **Corrigido** |
| Sem checagem de origem; corpo lido sem conferir o tipo | Baixa | **Corrigido** |
| `Content-Length` ausente furava o limite de tamanho | Baixa | **Corrigido**: tamanho conferido nos bytes |
| E-mail de alerta duplicado se cron e confirmação rodassem juntos | Baixa | **Corrigido**: reserva atômica |
| Limite de upload de 10 MB passava do corte de 4,5 MB da Vercel | Baixa | **Corrigido**: 4 MB |
| Sem autenticação | — | **Aceito para a demonstração**; ver [SEGURANCA.md](SEGURANCA.md) |

### Acessibilidade e UX

| Achado | Gravidade | Situação |
|---|---|---|
| Número grande do painel passava por cima da sala em 320 e 375 px | Alta | **Corrigido** (`clamp`) |
| Classe inexistente (`bg-card-raised`): a opção escolhida de Tema e de Receita/Despesa não aparecia | Alta | **Corrigido** |
| Campos de texto sem foco visível | Alta | **Corrigido** |
| Cadastro sem teclado certo (CNPJ, e-mail), sem `<form>` e sem Enter | Alta | **Corrigido** |
| Contraste: texto secundário no claro sobre o trilho (4,16:1), tom do cartão, barras do gráfico (1,7:1), contorno da sala (1,3:1) | Média | **Corrigido** (token mais escuro, tom mais fraco, opacidade 0,45, contorno) |
| Foco se perdia ao trocar de etapa do envio | Média | **Corrigido** |
| Telas em sheet sem `<main>`; dois `h1` | Média | **Corrigido** |
| Painel e Histórico sem título de página | Média | **Corrigido** |
| Botão fixo do rodapé cobrindo o campo com o teclado aberto | Média | **Corrigido** (sai da frente em telas de toque) |
| Campo de data vazio no iOS | Média | **Corrigido**: começa em hoje e sem o visual nativo |
| Corrigir lançamento reabria com alterações descartadas; "Cancelar" com dois sentidos | Média | **Corrigido** ("Descartar alterações") |
| Sair da conferência apagava tudo sem perguntar | Média | **Corrigido**: confirmação no padrão iOS, com foco na saída segura |
| Textos técnicos para o usuário ("npm run seed", "ambiente", caminho de doc) | Média | **Corrigido**: convite para cadastrar o MEI |
| "Ocultar valores" não escondia tudo | Média | **Corrigido** em previsão, simulação, conferência e confirmação |
| Simulação anunciava a cada dígito | Média | **Corrigido**: anúncio com atraso |
| Alvos de toque abaixo de 44 pt | Média | **Corrigido** |
| Abas e Tema quebravam em 320 px | Média | **Corrigido** |
| Extrato lido se perdia ao lançar uma entrada | Média | **Corrigido**: fica na aba |
| Filtro do histórico fora do endereço | Baixa | **Corrigido** |
| Ícone da previsão sempre laranja (a cor é estado) | Baixa | **Corrigido** |
| Cor da barra do navegador não seguia o tema escolhido | Baixa | **Corrigido** |
| Verde do visto de confirmação com pouco contraste no escuro | Baixa | **Corrigido** (`--on-ok`) |
| Esqueleto do painel diferente do conteúdo; histórico vazio sem ação | Baixa | **Corrigido** |
| Chevrons diferentes entre telas; tabela do relatório e impressão | Baixa | **Corrigido** |

### Polimento adicionado

Todas as animações respeitam "reduzir movimento".

- Estado de toque (`:active`) em botões, chips e cartões-link; `:hover` só em dispositivos com mouse.
- Entrada suave de tela em toda navegação; barras do gráfico crescem em sequência; o visto da confirmação
  aparece com um "pop" e o telhado se desenha.
- Foco visível único em tudo que é interativo.

### O que ficou de fora, de propósito ou por limite

Atualizado até a quarta rodada.

| Item | Por quê |
|---|---|
| Autenticação e vários MEIs | Fora do escopo da demonstração; é o próximo passo |
| Rate limit por IP | Precisa da regra de firewall da Vercel (configuração, não código) |
| Dynamic Type do iOS dentro do app web | O Safari só repassa o tamanho de texto do sistema com fonte de sistema específica; mexer no tamanho global arrisca quebrar o layout e não foi testado em aparelho |
| Modo offline / service worker | Risco de cache servir dado financeiro velho; precisa de desenho próprio |
| Seta de voltar (no lugar do X) nas telas abertas a partir de outras | Troca de padrão de navegação. Desde 25/11, o X volta para a tela de origem (com filtro e rolagem) quando ela é conhecida, em vez de ir sempre para uma tela fixa |
| Lembrete do DAS por e-mail | A tabela `alerts` guarda uma data por ano; o DAS é mensal (exige migração) |
| Teste com leitor de tela real (VoiceOver, TalkBack) e em Android | Na primeira rodada não havia aparelho; desde a terceira, o dono do projeto testa no iPhone (de onde vieram as correções do topo e da área segura). Android e leitor de tela real seguem sem teste |
| Testes automatizados de interface (E2E) | Só a lógica tem testes; a interface foi verificada à mão no navegador |

## Segunda rodada: auditoria externa por gravação de tela

Um assistente de IA (GPT) analisou uma gravação de ~2 minutos no celular. A conclusão dele: o problema não é falta de
funcionalidade, e sim a distância entre os números que o app mostra e o que o MEI entende deles. Cada achado foi
conferido no código antes de agir.

| Achado | Situação |
|---|---|
| Painel não explica limite proporcional, tolerância de 20% e o que acontece ao passar | **Corrigido**: "Entenda o limite" no Painel, com as três faixas e a consequência de cada uma |
| Simulador mostra "Crítico · 100%" ao chegar exatamente no limite | **Corrigido**: "Limite atingido", texto próprio e as duas referências sempre à vista |
| Previsão soa como garantia | **Corrigido**: média por mês, desde quando, e aviso de que muda a cada receita |
| Painel informa, mas não orienta | **Corrigido**: próximo passo por faixa (simular, falar com o contador) |
| "Notas 0 · tudo conferido" ambíguo | **Corrigido**: "nenhuma pendente" |
| DAS só com a data | **Corrigido** em parte: ganhou a competência ("ref. nov"). Valor fica de fora (depende da atividade) |
| Tela da IA técnica demais | **Corrigido**: resumo simples no topo; modelos e falhas em "Detalhes técnicos" |
| "Sem descrição" no histórico | **Corrigido**: mostra Receita ou Despesa |
| Simulação confundida com lucro | **Corrigido**: aviso de que a conta usa receita bruta |
| Navegação inferior cobre o conteúdo | **Não procede**: o fim da página reserva espaço acima da barra |
| R$ 67.500 seria uma "faixa preventiva" | **Premissa errada do avaliador**: é o limite legal proporcional (abertura em março) |

Não verificado por ele (nem por nós): desktop, 320 px, teclado, leitor de tela e contraste medido.

## Terceira rodada: uso real e ajustes pedidos

Feita em 25/11/2026, a partir de testes do dono do projeto no navegador e no celular, de vídeos e capturas do iOS
e de duas telas de referência (Bolso e PicPay).

| Achado | Situação |
|---|---|
| Sair de uma nota no X e tocar em "Enviar nota" trazia de volta a nota abandonada (o Next guarda a tela escondida, com o estado) | **Corrigido**: o fluxo descarta o estado ao sair. Reproduzido antes e confirmado depois |
| Foto acima de 4 MB era recusada, e quem fotografa não sabe reduzir | **Corrigido**: reduzida no aparelho (32 MB viraram 1,1 MB em 0,35 s no teste). PDF grande segue recusado, com a saída dita |
| Troca de tema instantânea, ao contrário do iPhone | **Corrigido**: dissolução de 0,4 s da tela inteira e marcador do seletor deslizando |
| "Ocultar valores" com borrão ainda deixa adivinhar os dígitos | **Corrigido**: barra lisa |
| Perfil pouco organizado e sem atalhos | **Corrigido**: grupos com ícones, lápis para editar, regras, instalar e primeiros passos, versão do app |
| Botão preto e branco sem separar "o que se toca" de "o que informa" | **Corrigido**: azul de interação; âmbar e vermelho só para risco |
| Receita em verde (o número que traz o risco aparecia como "bom") | **Corrigido**: receita neutra |
| "Crítico" e "Acima do limite" com o mesmo vermelho | **Corrigido**: laranja-avermelhado para Crítico e Limite atingido; vermelho com ícone próprio |
| Laranja do tema claro "barrento" | **Não dá para melhorar**: já é o mais claro que passa de 3:1 sobre o trilho (3,06). Os mais vivos reprovam |
| Editar o perfil sumia em produção | **Esperado**: a edição é bloqueada de propósito (sem login). Em desenvolvimento aparece; em produção, `ALLOW_PROFILE_EDIT=true` |

Ver também a segunda rodada (auditoria externa por gravação de tela), acima.

## Quarta rodada: auditoria de design independente

Feita em 25/11/2026 por um revisor de design que não viu as rodadas anteriores. Nota dada ao app: **6,5 de 10**.
Cada achado foi conferido no código antes de agir. O detalhe de como cada tela ficou está em
[INTERFACE.md](INTERFACE.md).

**Aplicado**

| Tema | O que mudou |
|---|---|
| Números | Uma regra só para reais inteiros: truncar (antes, 56.180 no painel e 56.181 no gráfico para o mesmo valor). O número do Painel mostra os centavos |
| Navegação | Abas Painel, Simular, Histórico e Mais, com o botão circular "Enviar" ao lado; Simular e Mais deixaram de ser folhas. As abas trocam sem animação de entrada |
| Painel | "Lançar sem nota" virou uma linha logo abaixo do número (antes, um falso campo de digitar no fim da página); a sala desce para baixo do número com texto ampliado; marca (telhado sobre o T) no topo |
| Barra do limite | Escala até 120%, traço no limite, faixa de tolerância tingida, o já faturado não encolhe, legenda do trecho novo |
| Gráfico | Valor e mês ao toque, meses em 3 letras, seletor com 44 px |
| DAS e previsão | DAS com atalho "Gerar guia" (PGMEI); previsão sem a caixa de conselho; "Entenda o limite" virou link para as Regras |
| Notas | O cartão mostra "Tudo conferido" quando não há pendentes e só vira link quando há |
| Histórico | Aviso de "Possível duplicidade"; filtros em 4 de largura igual; cancelados escondidos até pedir; linha sem CPF/CNPJ; "Sem descrição" em cinza |
| Simulador | Estado vazio sem venda inventada; "O que cabe" como ação própria; rótulo sem repetir "limite" |
| Privacidade | "Ocultar valores" esconde também a altura da sala e o preenchimento das barras, que revelavam o valor |
| Cor e foco | Azul do botão `#006ae0` (claro) e `#0a6fdf` (escuro): texto branco a 5,07:1 e 4,83:1. Foco visível e arredondado nos campos. A cota da IA deixou de ser verde |
| Movimento | A sala e o gráfico só animam na primeira visita da sessão |
| Envio e conferência | "Tirar foto" como ação principal e aviso de que a imagem vai para a IA; uma voz só (impessoal) nas mensagens; o botão de confirmar diz o que falta |
| Detalhe do lançamento | A descrição como título, datas no formato do app ("24 nov 2026, 16:54") e "Pela IA, conferida por você" no lugar da confiança da IA |
| Textos | "Avisos do limite" (antes Alertas), com atalho para trocar o e-mail; a tela da IA em linguagem de leigo, com a telemetria em "Detalhes técnicos"; "teto" só como nome do app; regras em frases inteiras |
| Ajuda | Instalar com o ícone de Compartilhar (iPhone) e botão de instalar de verdade (Android); Primeiros passos sem link nos passos feitos; 404 "Esta página saiu do ar", com a sala vazia |
| Layout | No computador e no tablet, a coluna do app emoldurada sobre um fundo de mesa; no iPhone, folga no topo depois da área segura e película sob a barra de status |

**Aplicado mesmo havendo opinião contrária:** a versão do app atrás de um toque (antes ficava sempre à vista) e
"Como a IA lê" no grupo "Sobre" da aba Mais.

**Não implementado**

| Sugestão | Situação |
|---|---|
| Deslizar para cancelar no histórico | Não feito: exige tratar gestos à mão (o app não usa biblioteca de gestos) e um cancelamento por engano custa caro; o cancelamento segue no detalhe, com confirmação |
| Link para ver o documento original | Não feito: exigiria servir o arquivo do bucket privado sem login, para qualquer pessoa com o endereço |
| Reduzir a escala tipográfica a cerca de 6 degraus | Não feito: mexe em todas as telas a poucos dias do envio, com risco de quebrar layouts que já foram conferidos; fica para depois do hackathon |
| Onboarding de 3 telas | Não feito: a demonstração já abre com um MEI cadastrado, então o júri não passaria por ele; o começo segue com o cadastro (`/bem-vindo`) e "Primeiros passos" |

## Depois da quarta rodada: ajustes de uso (26/11)

Achados do uso do app depois do PR #21, sem revisor externo. Cada um foi corrigido no código; o detalhe de como a
tela ficou está em [INTERFACE.md](INTERFACE.md).

| Achado | O que mudou |
|---|---|
| Com "Ocultar valores", os centavos do Painel continuavam à vista (têm cor própria dentro do valor) | **Corrigido**: tudo o que está dentro de um valor escondido some junto (`.sensitive *`) |
| O Simular mostrava vários números do mesmo tamanho, e não ficava claro qual importava | **Corrigido**: uma resposta só em número grande (quanto ainda cabe ou quanto a venda passa do limite), uma frase com a consequência, atalhos numa linha e "Usar o que ainda cabe" junto do campo |
| Telhado pontilhado torto (sem ponto no topo, lado direito diferente do esquerdo) na sala, na legenda "+20%" e no 404 | **Corrigido**: pontos calculados um a um e espelhados (`src/lib/roof.ts`) |
| A tela de Regras usava "desenquadrado", "proporcional" e "DAS" sem explicar, e deixava no rodapé que o limite é de faturamento, não de lucro | **Corrigido**: reescrita para leigo (`src/lib/rules-guide.ts`), abrindo com "Conta tudo que entra, não o lucro" e com "Você está aqui" na faixa atual |
| Simular, Previsão, Avisos e o e-mail diziam que acima de 20% a saída vale "desde janeiro"; no ano de abertura ela vale desde a abertura | **Corrigido**: as frases de estouro saem de um lugar só (`src/lib/copy.ts`) e recebem a data de abertura, inclusive no e-mail |
| O selo "Teto" no topo do Painel, pequeno, parecia a seta de enviar | **Corrigido**: saiu; o topo mostra só o nome da tela, como nos apps de celular |
| A troca de aba era um corte seco | **Corrigido**: a cápsula da barra desliza até a aba tocada, e o conteúdo entra num fundido de 0,18 s (nada anima com "reduzir movimento") |
| O Histórico era o ano inteiro numa lista só, sem busca nem totais, e o filtro "Conferir" ficava sempre vazio | **Corrigido**, com ideias do Bolso: um mês por vez com resumo de receitas e despesas, busca no ano todo, saldo de cada dia, filtro Todos, Receitas ou Despesas, e o título da linha com inicial maiúscula (sem descrição, o tipo vira o título). "Conferir" saiu porque nenhum fluxo grava `pendente` |

## Ajustes de 27/11

Mesma forma da seção anterior: achados do uso, sem revisor externo, todos corrigidos no código e ainda sem PR
(estão na `feat/chave-e-latencia`, depois do #22). O detalhe está em [INTERFACE.md](INTERFACE.md).

| Achado | O que mudou |
|---|---|
| Botão secundário branco com texto preto parecia rótulo, não botão | **Corrigido**: texto azul, o que se toca ("Corrigir lançamento", agora com lápis, "Imprimir ou salvar em PDF", "Cancelar" da leitura) |
| "Mostrar N cancelados" espalhava os cancelados pelos dias, longe do toque | **Corrigido**: grupo próprio logo abaixo do botão, com a data em cada linha |
| "Comparar extrato", no topo do Histórico, não dizia para que servia | **Corrigido**: linha "Conferir extrato do banco" ("Ache vendas que faltam no Teto") abaixo do resumo do mês |
| O extrato do PicPay perdia as saídas (menos tipográfico "−") e quem pagou (coluna "origem / destino"), e resgate de cofrinho aparecia como entrada sem nota | **Corrigido**: o leitor entende o "−", "origem / destino" e "tipo"; resgate, aplicação, rendimento, estorno e transferência entre contas ficam de fora (`isOwnMovement`) |
| A tela do extrato seguia com a explicação grande depois do arquivo, empilhava três listas e não encolhia | **Corrigido**: a resposta primeiro em número grande, as listas num controle segmentado, entradas por dia e "Não é receita" (com "Desfazer") para a lista encolher |
| "Lançar" e "Não é receita" sem hierarquia (primeiro em cápsulas cinza, que no escuro não pareciam botão; depois os dois só em texto azul) | **Corrigido**: "Lançar" em cápsula azul cheia, "Não é receita" em texto azul |
| Os cartões do Painel, todos com ícone preto em quadradinho cinza, pareciam desabilitados | **Corrigido**: quadradinho com cor (`IconTile`): azul na ação, azul-petróleo no DAS (âmbar a cinco dias ou menos), cor do estado na Previsão e nas Notas, a barra selecionada do gráfico em azul (as outras seguem cinza, pelo contraste). O roxo testado em "Entenda o limite" saiu |
| Sem mãozinha nos botões (o Tailwind v4 tirou o ponteiro) e sem hover nos botões cheios, nas abas e nos links | **Corrigido**: uma regra global em `src/app/globals.css` para o cursor, e um clarear leve só onde há mouse |
| O relatório do ano mostrava a contagem de lançamentos por mês, que diz pouco, e no PDF o total se repetia no pé da primeira página | **Corrigido**: cada mês dividido em com nota e sem nota (como o relatório mensal oficial), o estado no topo, despesas e cancelados em linhas, e o total uma vez só na impressão |
| O "Lançar" do extrato tinha 36 px de altura | **Corrigido**: a área de toque passa de 44 px, sem mudar o desenho |
| Percentual arredondado: 89,5% aparecia como "90%" com a faixa ainda em "Atenção" (o Crítico começa em 90%) | **Corrigido**: o percentual é truncado, como os reais |
| Envio de nota: "Escolher arquivo" em preto, sem saída para quem não tem nota, "Lendo a nota" vazia, número sem rótulo em "Depois de confirmar" | **Corrigido**: texto azul, link "Lançar sem nota", miniatura da foto durante a leitura, rótulo "Faturamento do ano com esta nota" e "Ainda cabem R$ X" (a mesma palavra do Painel) |
| "Tudo conferido" grande e verde quebrava a linha e parecia alerta; DAS e Notas com o conteúdo em alturas diferentes | **Corrigido**: "Em dia" no formato do DAS, legenda "nada para conferir", e o conteúdo dos dois logo abaixo do título |
