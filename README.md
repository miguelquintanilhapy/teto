# Teto

**Saiba quanto falta para o teto do seu MEI, antes de estourar.**

Muitos MEIs não somam o que faturam e só descobrem tarde que passaram do limite
anual, quando o imposto já é retroativo. O Teto lê notas e extratos, organiza a
receita, mostra quanto falta para o limite, projeta quando ele será ultrapassado
e estima quanto o estouro custaria.

Projeto do **Hack Brasil 2026**, trilha **Pagamentos & finanças**.

> Todos os dados de demonstração são sintéticos. O Teto não substitui um contador:
> valores de custo são **estimativas**. Veja [docs/mei-rules.md](docs/mei-rules.md).

## O que faz

- Lê foto ou PDF de notas e recibos com IA e pede confirmação com um clique.
- Painel: receita acumulada, percentual do limite, folga e projeção de estouro.
- Limite proporcional para quem abriu o MEI no meio do ano.
- Simulador: "e se eu aceitar uma venda de R$ X?", com o custo estimado.
- Cruza o extrato bancário com as notas e aponta entradas sem nota.
- Alertas de 80% e 100% do limite e lembrete do DAS.

## Como funciona (resumo)

**A IA propõe, o código dispõe.** O modelo só extrai os campos do documento.
Limites, risco, projeção, alertas e conciliação são código próprio em
`src/core`, puro e testado. A extração passa por uma **cadeia de modelos
gratuitos** de mais de um fornecedor, com failover, escalonamento por qualidade
e validação determinística da resposta.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Camadas, fluxos, segurança, falhas, testes e decisões |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Schema do banco, restrições e regras de consistência |
| [docs/AI-ENGINEERING.md](docs/AI-ENGINEERING.md) | Práticas de engenharia de IA e avaliação |
| [docs/mei-rules.md](docs/mei-rules.md) | Regras do MEI, fontes e questões em aberto |
| [docs/PLANO.md](docs/PLANO.md) | Calendário, frentes de trabalho e definição de pronto |
| [docs/AUDITORIA.md](docs/AUDITORIA.md) | Estado de qualidade: desenho × implementação |
| [docs/EVAL-RESULTS.md](docs/EVAL-RESULTS.md) | Resultados da avaliação da extração (gerado) |

## Limitações conhecidas

- Cobre o MEI comum; categorias com limite diferente estão fora do escopo.
- O custo do estouro é uma estimativa, não cálculo oficial.
- Demonstração com perfil único e dados fictícios, sem login.
- A projeção é linear e não considera sazonalidade.

```
src/
  core/      regras do MEI: puras, sem I/O, 100% testáveis
  server/    extração com IA (cadeia de provedores), casos de uso
  app/       interface e rotas (Next.js)
docs/        arquitetura, regras do MEI, engenharia de IA
```

## Rodando localmente

Requisitos: Node 24 e npm.

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev                  # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm test` | Testes unitários (Vitest) |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint |
| `npm run check` | Lint + tipos + testes (o mesmo que a CI roda) |
| `npm run check:supabase` | Confere a conexão e o schema do banco (não imprime chaves) |
| `npm run check:ai` | Faz uma chamada real a cada modelo da cadeia (usa a cota gratuita) |
| `npm run eval` | Avalia a extração nas notas sintéticas, repetindo respostas gravadas (sem rede) |
| `npm run eval:record` | Regrava as respostas chamando os modelos de verdade |
| `npm run fixtures:generate` | Regenera as notas sintéticas e o gabarito |

## Estado atual

- [x] Núcleo de regras do MEI com testes
- [x] Roteador de modelos em cadeia com testes (failover, cooldown, orçamento de tempo, cota diária)
- [x] Validação de ambiente e migração inicial do banco
- [x] Adaptadores dos provedores de IA (Gemini e OpenRouter)
- [ ] Persistência (Supabase) e rotas de API
- [ ] Interface (upload, confirmação, painel, simulador)
- [ ] Alertas por e-mail e cron
- [x] Harness de avaliação da extração ([resultados](docs/EVAL-RESULTS.md))

## Nota técnica

`package.json` fixa `typescript-eslint` em `8.73.0` (campo `overrides`) por causa
de uma publicação parcial da versão 8.74.0 no npm em 23/11/2026. Remover quando
o registro estabilizar.
