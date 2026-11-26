# Resultados da avaliação da extração

> Gerado por `npm run eval`. **Não edite à mão.** Notas 100% sintéticas e gabarito conhecido; as respostas dos modelos ficam gravadas em `fixtures/eval/recordings` para o resultado ser reprodutível.

- Casos: **26** · prompt: **v4** · modo: replay
- Cadeia: `gemini:gemini-3.5-flash-lite` → `openrouter:nvidia/nemotron-3.5-super-vl:free` → `gemini:gemini-flash-lite-latest` → `gemini:gemini-3.6-flash`
- Gravação mais recente: 2026-11-25

## Cadeia completa (o que o usuário vive)

| Resultado | Casos | Taxa |
|---|---|---|
| Aceita automaticamente e **completa** (data, valor, emissor e destinatário certos) | 26 | 100% |
| Aceita, certa para o limite, mas com dado de terceiro **faltando ou diferente** | 0 | 0% |
| Aceita automaticamente e **errada para o limite** (erro silencioso) | 0 | 0% |
| Enviada para revisão manual | 0 | 0% |
| Falha total (nenhum modelo respondeu) | 0 | 0% |

Tentativas por nota (média): 1,00. Quem respondeu: `gemini:gemini-3.5-flash-lite` 26.

O número que mais importa é o **erro silencioso**: uma extração errada para o limite (data, valor ou direção) aceita sem revisão. Um dado de terceiro faltando (por exemplo, um CPF ilegível) não muda o acumulado e é contado à parte. Em todos os casos, a extração só entra no limite depois que o usuário confirma.

## Por modelo (cada um sozinho)

| Modelo | Gravações | JSON válido | Certo p/ o limite | Núcleo completo | Direção | Passa nas regras | p50 | p95 |
|---|---|---|---|---|---|---|---|---|
| `gemini:gemini-3.5-flash-lite` | 26/26 | 100% | 100% | 100% | 100% | 96% | 2,3 s | 7,7 s |
| `openrouter:nvidia/nemotron-3.5-super-vl:free` | 0/26 | n/d | n/d | n/d | n/d | n/d | n/d | n/d |
| `gemini:gemini-flash-lite-latest` | 26/26 | 100% | 100% | 100% | 100% | 96% | 2,5 s | 8,3 s |
| `gemini:gemini-3.6-flash` | 0/26 | n/d | n/d | n/d | n/d | n/d | n/d | n/d |

_Certo p/ o limite = data, valor e direção (receita/despesa) certos. Núcleo completo = além disso, emissor e destinatário certos. Direção é derivada pelo código._

### Acerto por campo

| Modelo | tipo | data | valor | emissor | destinatário | chave |
|---|---|---|---|---|---|---|
| `gemini:gemini-3.5-flash-lite` | 100% | 100% | 100% | 100% | 100% | 96% |
| `openrouter:nvidia/nemotron-3.5-super-vl:free` | n/d | n/d | n/d | n/d | n/d | n/d |
| `gemini:gemini-flash-lite-latest` | 100% | 100% | 100% | 100% | 100% | 96% |
| `gemini:gemini-3.6-flash` | n/d | n/d | n/d | n/d | n/d | n/d |

## Por tipo de caso (cadeia)

| Etiqueta | Corretos / total |
|---|---|
| adversarial | 3/3 |
| baixa-qualidade | 1/1 |
| borrada | 1/1 |
| chave-de-acesso | 4/4 |
| consumidor-nao-identificado | 1/1 |
| data-por-extenso | 1/1 |
| despesa | 3/3 |
| direcao-indefinida | 1/1 |
| documento-mascarado | 2/2 |
| em-ingles | 1/1 |
| injecao-de-prompt | 3/3 |
| letra-manuscrita | 1/1 |
| mei-paga | 1/1 |
| nfce | 3/3 |
| nfe | 2/2 |
| nfse | 7/7 |
| ordem-invertida | 1/1 |
| pf | 8/8 |
| pix | 6/6 |
| pj | 10/10 |
| receita | 22/22 |
| recibo | 4/4 |
| rotacionada | 1/1 |
| rotulos-origem-destino | 1/1 |
| terceiros | 1/1 |
| valor-alto | 4/4 |
| valor-baixo | 1/1 |
| varias-linhas | 1/1 |

## Erros silenciosos (afetam o limite)

Nenhum nesta execução.

## Aceitas, certas para o limite, com dado de terceiro faltando ou diferente

Nenhuma nesta execução.

## Resultado por nota

| Nota | Cadeia | `gemini:gemini-3.5-flash-lite` | `openrouter:nvidia/nemotron-3.5-super-vl:free` | `gemini:gemini-flash-lite-latest` | `gemini:gemini-3.6-flash` |
|---|---|---|---|---|---|
| nfse-01 | ✓ | ✓ | · | ✓ | · |
| nfse-02 | ✓ | ✓ | · | ✓ | · |
| nfse-03 | ✓ | ✓ | · | ✓ | · |
| nfse-04 | ✓ | ✓ | · | ✓ | · |
| nfse-05 | ✓ | ✓ | · | ✓ | · |
| nfse-06 | ✓ | ✓ | · | ✓ | · |
| nfe-01 | ✓ | ✓ | · | ✓ | · |
| recibo-01 | ✓ | ✓ | · | ✓ | · |
| recibo-02 | ✓ | ✓ | · | ✓ | · |
| recibo-03 | ✓ | ✓ | · | ✓ | · |
| pix-01 | ✓ | ✓ | · | ✓ | · |
| pix-02 | ✓ | ✓ | · | ✓ | · |
| cupom-01 | ✓ | ✓ | · | ✓ | · |
| cupom-02 | ✓ | ✓ | · | ✓ | · |
| adv-01 | ✓ | ✓ | · | ✓ | · |
| adv-02 | ✓ | ✓ | · | ✓ | · |
| lowq-01 | ✓ | ✓ | · | ✓ | · |
| nfse-07 | ✓ | ✓ | · | ✓ | · |
| nfe-02 | ✓ | ✓ | · | ✓ | · |
| recibo-04 | ✓ | ✓ | · | ✓ | · |
| pix-03 | ✓ | ✓ | · | ✓ | · |
| cupom-03 | ✓ | ✓ | · | ✓ | · |
| adv-03 | ✓ | ✓ | · | ✓ | · |
| pix-04 | ✓ | ✓ | · | ✓ | · |
| pix-05 | ✓ | ✓ | · | ✓ | · |
| pix-06 | ✓ | ✓ | · | ✓ | · |

Legenda: ✓ núcleo correto · ✓ incompleta = certa para o limite, falta dado de terceiro · ✗ errado · revisão = precisaria de conferência manual · · sem gravação.
