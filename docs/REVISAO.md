# Revisão de UX, acessibilidade e segurança

Feita em 24/11/2026 por dois revisores independentes (cada um leu o código sem a conclusão do outro) mais
verificação no navegador em modo de produção. Este documento diz **o que achamos, o que foi corrigido e o que
ficou**. Ver [SEGURANCA.md](SEGURANCA.md) e [INTERFACE.md](INTERFACE.md).

## Como foi verificado

- 386 testes automatizados (núcleo, serviços, handlers HTTP, helpers de interface).
- Build de produção e servidor de produção: troca de aba medida em 11 a 21 ms.
- Requisições hostis contra o servidor real: origem de outro site (`403`), `text/plain` (`415`), edição do
  cadastro em produção (`403`), cron sem segredo (`401`), CPF mascarado na API.
- Console do navegador: sem violação de CSP e sem erro de hidratação.
- Modo claro e escuro, 375 px de largura, teclado e leitor de tela (por marcação, não com leitor real).

## Segurança

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

## Acessibilidade e UX

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

## Polimento adicionado

Todas as animações respeitam "reduzir movimento".

- Estado de toque (`:active`) em botões, chips e cartões-link; `:hover` só em dispositivos com mouse.
- Entrada suave de tela em toda navegação; barras do gráfico crescem em sequência; o visto da confirmação
  aparece com um "pop" e o telhado se desenha.
- Foco visível único em tudo que é interativo.

## O que ficou de fora, de propósito ou por limite

| Item | Por quê |
|---|---|
| Autenticação e vários MEIs | Fora do escopo da demonstração; é o próximo passo |
| Rate limit por IP | Precisa da regra de firewall da Vercel (configuração, não código) |
| Dynamic Type do iOS dentro do app web | O Safari só repassa o tamanho de texto do sistema com fonte de sistema específica; mexer no tamanho global arrisca quebrar o layout e não foi testado em aparelho |
| Modo offline / service worker | Risco de cache servir dado financeiro velho; precisa de desenho próprio |
| Seta de voltar (no lugar do X) nas telas abertas a partir de outras | Troca de padrão de navegação; o X cumpre a função, mas empilha histórico do navegador |
| Lembrete do DAS por e-mail | A tabela `alerts` guarda uma data por ano; o DAS é mensal (exige migração) |
| Teste com leitor de tela real (VoiceOver, TalkBack) e em aparelho | Não havia aparelho; a verificação foi por marcação e no navegador |
| Testes automatizados de interface (E2E) | Só a lógica tem testes; a interface foi verificada à mão no navegador |
