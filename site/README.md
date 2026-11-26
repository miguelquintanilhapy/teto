# Site de apresentação do Teto

Página única que apresenta o Teto: o problema do limite do MEI, os recursos com telas reais do app, como usar,
para quem é, quem somos e a chamada para abrir o app.

É um projeto **à parte** do app: tem `package.json` próprio e não importa nada de `../src`. O app só é citado por
link (`src/lib/links.ts`). O `tsconfig.json` e o `eslint.config.mjs` da raiz ignoram esta pasta.

## Como rodar

Node 24, dentro de `site/`:

```bash
npm install
npm run dev        # http://localhost:3100
npm run build && npm start
npm run typecheck
```

Não precisa de variável de ambiente nenhuma.

## Tecnologias

- **Next.js 16 + React 19 + Tailwind 4**, nas mesmas versões do app.
- **Motion** (`motion/react`) para as animações. O `MotionConfig reducedMotion="user"` (`src/components/providers.tsx`)
  segue o "reduzir movimento" do sistema: os deslocamentos somem e ficam só os fundidos.
- **Phosphor** para os ícones, na mesma versão do app.
- **qrcode** para o QR code da chamada final, desenhado no build (`src/components/qr-code.tsx`).
- Fontes **Inter Tight** (títulos) e **Inter** (texto), servidas pelo `next/font`.

## Estrutura

```
src/app/          layout, página, 404, ícones e imagem de compartilhamento (opengraph-image.tsx)
src/components/   uma seção por arquivo (hero, problem, features, how-it-works, audience, about, final-cta)
                  e as peças comuns (header, footer, phone, roof, logo, reveal, qr-code)
src/lib/          links e seções, curva e entrada padrão das animações
src/assets/       capturas do app (telas/), logo (marca/) e a fonte recortada da imagem de compartilhamento (fontes/)
scripts/          capturar-telas.mjs
```

## Decisões de design

- **O telhado é a assinatura.** O mesmo desenho da marca e da "sala" do app: o traço cheio é o limite, e o pontilhado
  âmbar, o limite com 20% de tolerância. No hero, ele pousa sobre o celular, como o telhado sobre o T do logo; no
  problema, a sala enche com a rolagem e atravessa os dois; no fecho, ele se desenha de novo.
- **Palcos alternados.** Seções pretas (hero, problema, como usar, quem somos, fecho) e claras (recursos, para quem).
  Cada seção diz o seu palco com `data-nav`, e o cabeçalho troca o vidro conforme o que está embaixo.
- **As cores são as do app**, com os mesmos papéis (`src/app/globals.css`): azul é o que se toca; âmbar, laranja e
  vermelho são risco; verde é "dentro do limite". O risco nunca vem só em cor: sempre com ícone e texto.
- **Nada inventado.** Os textos descrevem só o que o app faz, os valores das regras vêm de
  [`docs/mei-rules.md`](../docs/mei-rules.md) e as telas são capturas reais do app publicado.
- **Acessibilidade.** Contraste acima de 4,5:1 no texto, alvos de 44 px, foco visível, link para pular ao conteúdo,
  "reduzir movimento" respeitado. Sem JavaScript, as entradas animadas aparecem de uma vez (`<noscript>` no layout).

## Atualizar as capturas do app

```bash
npm run capturas                       # usa https://teto-omega.vercel.app
npm run capturas -- http://localhost:3000
```

O script abre o Edge ou o Chrome instalado, emula um iPhone (390 × 844 a 3x) e grava WebP em `src/assets/telas/`.
**Só dados fictícios**: aponte para o perfil de demonstração. A tela de avisos fica de fora de propósito, porque
mostra parte do e-mail cadastrado. Confira cada captura antes de commitar.

## Publicar na Vercel

O site é um projeto Vercel separado do app. Rode a CLI **de dentro de `site/`**. Na raiz, ela publicaria o app.

```bash
cd site
npx vercel --prod
```

Na primeira vez, escolha "Create a new project", responda **não** a ligar o repositório do Git (só o dono do
repositório pode ligar) e não mude as configurações detectadas. A pasta `.vercel` que a CLI cria está no
`.gitignore`.

Se o dono do repositório quiser publicar a cada push: na Vercel, **Add New → Project**, o repositório `teto` e
**Root Directory** `site`.
