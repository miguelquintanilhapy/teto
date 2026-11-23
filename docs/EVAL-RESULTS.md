# Resultados da avaliação da extração

> Gerado por `npm run eval`. **Não edite à mão.** Notas 100% sintéticas e gabarito conhecido; as respostas dos modelos ficam gravadas em `fixtures/eval/recordings` para o resultado ser reprodutível.

- Casos: **17** · prompt: **v2** · modo: replay
- Cadeia: `gemini:gemini-3.1-flash-lite` → `gemini:gemini-3.8-flash` → `openrouter:nvidia/nemotron-3.5-super-vl:free`
- Gravação mais recente: 2026-11-23

## Cadeia completa (o que o usuário vive)

| Resultado | Casos | Taxa |
|---|---|---|
| Aceita automaticamente e **correta** | 14 | 82% |
| Aceita automaticamente e **errada** (erro silencioso) | 1 | 6% |
| Enviada para revisão manual | 2 | 12% |
| Falha total (nenhum modelo respondeu) | 0 | 0% |

Tentativas por nota (média): 2,65. Quem respondeu: `openrouter:nvidia/nemotron-3.5-super-vl:free` 12, `gemini:gemini-3.1-flash-lite` 3.

O número que mais importa é o **erro silencioso**: uma extração errada aceita sem revisão. Por isso toda extração só entra no limite depois que o usuário confirma.

## Por modelo (cada um sozinho)

| Modelo | Gravações | JSON válido | Núcleo correto | Direção | Passa nas regras | p50 | p95 |
|---|---|---|---|---|---|---|---|
| `gemini:gemini-3.1-flash-lite` | 3/17 | 100% | 100% | 100% | 100% | 16,0 s | 80,4 s |
| `gemini:gemini-3.8-flash` | 0/17 | n/d | n/d | n/d | n/d | n/d | n/d |
| `openrouter:nvidia/nemotron-3.5-super-vl:free` | 14/17 | 100% | 93% | 100% | 86% | 3,8 s | 5,8 s |

_Núcleo = data, valor, emissor e destinatário todos certos. Direção = receita/despesa derivada pelo código._

### Acerto por campo

| Modelo | tipo | data | valor | emissor | destinatário | chave |
|---|---|---|---|---|---|---|
| `gemini:gemini-3.1-flash-lite` | 100% | 100% | 100% | 100% | 100% | 100% |
| `gemini:gemini-3.8-flash` | n/d | n/d | n/d | n/d | n/d | n/d |
| `openrouter:nvidia/nemotron-3.5-super-vl:free` | 100% | 100% | 100% | 100% | 93% | 86% |

## Por tipo de caso (cadeia)

| Etiqueta | Corretos / total |
|---|---|
| adversarial | 2/2 |
| baixa-qualidade | 1/1 |
| borrada | 1/1 |
| chave-de-acesso | 0/2 |
| consumidor-nao-identificado | 1/1 |
| data-por-extenso | 1/1 |
| despesa | 1/2 |
| documento-mascarado | 1/1 |
| injecao-de-prompt | 2/2 |
| letra-manuscrita | 0/1 |
| nfce | 1/2 |
| nfe | 0/1 |
| nfse | 6/6 |
| pf | 4/5 |
| pix | 2/2 |
| pj | 5/6 |
| receita | 13/15 |
| recibo | 2/3 |
| rotacionada | 1/1 |
| valor-alto | 2/2 |
| valor-baixo | 1/1 |

## Erros silenciosos

- `recibo-03` (openrouter:nvidia/nemotron-3.5-super-vl:free): divergiu em recipientTaxId

## Resultado por nota

| Nota | Cadeia | `gemini:gemini-3.1-flash-lite` | `gemini:gemini-3.8-flash` | `openrouter:nvidia/nemotron-3.5-super-vl:free` |
|---|---|---|---|---|
| nfse-01 | ✓ | · | · | ✓ |
| nfse-02 | ✓ | · | · | ✓ |
| nfse-03 | ✓ | · | · | ✓ |
| nfse-04 | ✓ | · | · | ✓ |
| nfse-05 | ✓ | · | · | ✓ |
| nfse-06 | ✓ | · | · | ✓ |
| nfe-01 | revisão | · | · | ✓ |
| recibo-01 | ✓ | ✓ | · | · |
| recibo-02 | ✓ | · | · | ✓ |
| recibo-03 | ✗ silencioso | · | · | ✗ |
| pix-01 | ✓ | · | · | ✓ |
| pix-02 | ✓ | · | · | ✓ |
| cupom-01 | revisão | · | · | ✓ |
| cupom-02 | ✓ | · | · | ✓ |
| adv-01 | ✓ | ✓ | · | · |
| adv-02 | ✓ | ✓ | · | · |
| lowq-01 | ✓ | · | · | ✓ |

Legenda: ✓ núcleo correto · ✗ errado · revisão = precisaria de conferência manual · · sem gravação.
