# Segurança

Modelo de ameaças, defesas, riscos aceitos e o que falta. Ver também [arquitetura](ARCHITECTURE.md),
[revisão](REVISAO.md) e o [README](../README.md).

## Premissa que muda tudo: não há login

O Teto é uma demonstração com **um perfil e dados fictícios**. Não existe autenticação. Quem tiver o endereço
público consegue chamar as rotas. Tudo abaixo existe para limitar o estrago dessa premissa, e **nenhuma defesa
substitui autenticação** quando houver dados reais.

## O que um estranho consegue fazer hoje

| Ação | Consegue? | Limite |
|---|---|---|
| Ler lançamentos (`GET /api/transactions`, painel) | Sim | CPF/CNPJ da outra parte e a chave de acesso saem **mascarados** |
| Enviar notas (gasta IA e storage) | Sim | 30 documentos novos a cada 10 min (`429`), cota diária global (`EXTRACTION_DAILY_QUOTA`), 4 MB por arquivo, tipo conferido pelos bytes |
| Confirmar lançamentos | Sim | Valor até R$ 10 milhões, data até amanhã, corpo estrito, um lançamento por documento |
| Cancelar ou corrigir lançamentos | Sim | Só valor, data e descrição; tudo no histórico (`transaction_events`) |
| Editar o cadastro do MEI | **Não em produção** | `403 edit_disabled` por padrão; só o primeiro cadastro é livre. `ALLOW_PROFILE_EDIT=true` libera |
| Disparar o cron de alertas | Não | `Authorization: Bearer <CRON_SECRET>`, comparação em tempo constante |
| Ler o e-mail do perfil | Não | Sai mascarado (`m•••@dominio`); a edição, quando liberada, é a única tela que o recebe |
| Ler o CNPJ do MEI | Sim | Vai inteiro para o navegador em `/enviar` e `/lancar`: a conferência precisa dele para mostrar receita ou despesa antes de confirmar (o servidor decide de novo ao gravar). É o dado do próprio MEI, fictício na demo |

**Risco aceito para o hackathon:** o painel precisa deixar o júri cancelar e corrigir, então `PATCH` fica
aberto. O risco é vandalismo dos dados fictícios; restaure com `npm run seed:demo -- --reset` seguido de
`npm run seed:demo`.

## Defesas implementadas

### Entrada
- Corpos JSON só como `application/json`, com tamanho conferido **de verdade** (não só o `Content-Length`).
- Zod `.strict()` em todos os corpos: campo desconhecido (`status`, `id`, `profileId`) é recusado.
- Identificadores como UUID. Valores em centavos inteiros e com teto. Datas validadas, aceitas até amanhã
  (contando "hoje" no fuso de Brasília), nunca depois.
- Upload: tipo pelos primeiros bytes (nunca pela extensão), 4 MB (abaixo do corte de 4,5 MB da Vercel; o app reduz fotos grandes
  no aparelho antes de enviar, mas o servidor confere o limite de qualquer jeito),
  armazenamento privado, caminho derivado do hash.
- O **tipo do lançamento** (receita ou despesa) é do código. O cliente só escolhe quando o CNPJ do MEI não
  aparece; se contradisser o que o CNPJ mostra, `422 direction_conflict`. Assim ninguém tira receita do limite.

### Requisição
- `Origin` de outro site nas rotas que gravam: `403`. Formulário de outro site só envia `text/plain`: `415`.
- Sem `X-Powered-By`. Erros de API são genéricos; a causa vai para o log, cortada em 200 caracteres.

### Cabeçalhos (`next.config.ts`)
`Content-Security-Policy` (só a própria origem; `object-src 'none'`; `frame-ancestors 'none'`),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
(sem câmera, microfone, localização), `Cross-Origin-Opener-Policy` e `Strict-Transport-Security`.

`script-src` tem `'unsafe-inline'` porque o Next injeta o script de hidratação sem nonce. É a parte mais
fraca da política; o resto está fechado.

### Dados
- RLS ativada em todas as tabelas, sem política para `anon`/`authenticated`: o navegador nunca fala com o
  banco. O servidor usa a chave de serviço, que nunca vai para o cliente.
- `NEXT_PUBLIC_*` só tem a URL e a chave anônima (inútil sem políticas).
- Dado pessoal mascarado **no servidor**, antes de entrar no payload da tela. Exceção: o CNPJ do próprio MEI, nas
  telas de envio e de lançamento (ver a tabela acima).

### Saídas
- React escapa tudo. O único `dangerouslySetInnerHTML` recebe uma constante.
- **E-mail:** HTML escapado; o nome do MEI não pode ter link nem e-mail (iria para o corpo do alerta).
- **CSV:** células que começam com `= + - @` ganham apóstrofo (injeção de fórmula no Excel).
  O download sai `no-store` e `nosniff`.
- **IA:** a saída passa por Zod e pelas regras de negócio, não define receita/despesa, e o usuário confere
  antes de somar. O pior caso de uma nota com injeção de prompt é um formulário pré-preenchido errado.

### Concorrência
- Um documento vira no máximo um lançamento (índice único + tratamento da corrida).
- Alertas: reserva atômica (`update … where sent_at is null returning`) antes de enviar; falha devolve à fila.
- Idempotência por hash do arquivo e por chave de acesso.

## Verificado em 25/11/2026

- `npm audit --omit=dev`: 0 vulnerabilidades. Roda na CI a cada PR (`--audit-level=high`: alta ou crítica reprova).
- `gitleaks`: varre o histórico inteiro do Git na CI, num job próprio (`secrets`), a cada PR e push na `main`.
  Em 26/11: 164 commits, nenhum vazamento. O único achado era o `CRON_SECRET` fictício do teste de ambiente,
  liberado pela impressão digital exata em `.gitleaksignore` e por `gitleaks:allow` na linha (a regra continua
  valendo para o resto). Um token falso commitado num clone descartável foi detectado, como esperado.
- Dependabot (`.github/dependabot.yml`): `npm` e GitHub Actions, toda segunda-feira.
- Requisições hostis contra o servidor de produção local: `Origin` de outro site (`403`), `text/plain` (`415`),
  edição do cadastro em produção (`403`), cron sem segredo (`401`), CPF mascarado na API.
- Console do navegador sem violação de CSP.
- Rodada de testes automáticos: 470 em 46 arquivos (núcleo, serviços, handlers, lógica da interface).

## Migração `0002` (já aplicada no banco do projeto)

Quem criar um banco novo precisa rodar [`0002_one_transaction_per_document.sql`](../supabase/migrations/0002_one_transaction_per_document.sql)
no SQL Editor. Sem ela, o código ainda protege a maioria dos casos, mas só o banco fecha a corrida de dois
toques simultâneos em "Confirmar".

## O que ainda falta

1. **Autenticação e vários MEIs.** Sem isto, tudo acima é mitigação. É o próximo passo para dados reais.
2. **Rate limit por IP.** Hoje o teto de envios é global (por perfil). Um atacante consegue esgotar a janela
   para todos por alguns minutos. A regra de rate limit da Vercel resolve sem código.
3. **CSP com nonce** (tira o `'unsafe-inline'` do script).
4. **Leitura e gravação simultâneas.** Para o envio ser mais rápido, a IA lê (e consome a cota) ao mesmo tempo em
   que o arquivo é gravado no storage. Se a gravação falha depois da leitura, a cota daquela leitura se perde.
   Arquivo inválido, repetido ou acima da janela é recusado antes das duas coisas.
5. **Cota de IA global:** um script consegue gastar a cota do dia (`200`) e deixar o júri sem leitura por IA;
   o app degrada para preenchimento manual, sem cair.
6. ~~`npm audit` periódico e Dependabot.~~ Feito em 26/11 (CI e `.github/dependabot.yml`).
