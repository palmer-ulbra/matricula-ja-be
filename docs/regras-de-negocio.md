# 📜 Regras de negócio — MatriculaJá

As regras que o sistema **deve** cumprir. Cada uma tem um identificador estável (`RN-n`):
use esse identificador nos nomes de teste, nos casos de teste e nos registros de defeito.

> Este documento é o **oráculo**: quando o código e uma regra daqui discordarem, quem está
> errado é o código.

---

## RN-1 🎟️ Vaga

Uma turma só aceita nova matrícula se `vagas_ocupadas < vagas_totais`.

| | |
| --- | --- |
| Recusa com | `409` |
| Mensagem | `Turma sem vaga disponível` |

O incremento e o decremento de vaga acontecem **na mesma transação** da mudança de estado
da matrícula: uma falha no meio não deixa vaga presa.

---

## RN-2 🔗 Pré-requisito

Se a disciplina da turma tem `pre_requisito_id`, o aluno só se matricula se essa
disciplina constar no histórico dele com situação `APROVADO`.

| | |
| --- | --- |
| Recusa com | `422` |
| Mensagem | `Pré-requisito não cumprido: <código> <nome>` |

O pré-requisito é encadeado **apenas um nível** — não há verificação recursiva.

A consulta ao histórico passa por um serviço externo (`consultarAprovacao`), com timeout
de 3s. Se ele falhar ou expirar, a matrícula **não** é confirmada: responde `503`
`Não foi possível verificar o pré-requisito`. Falha nunca é tratada como aprovação.

---

## RN-3 ⏰ Choque de horário

Um aluno não pode ter duas matrículas `PENDENTE` ou `CONFIRMADA` em turmas cujos horários
se sobreponham no mesmo dia da semana.

Sobreposição é qualquer interseção de intervalo, com **fim exclusivo**:

| Par de horários | Choca? |
| --- | :---: |
| `[19:00, 20:40)` e `[20:00, 21:40)` | ✅ sim |
| `[19:00, 20:40)` e `[20:40, 22:20)` | ❌ não |

| | |
| --- | --- |
| Recusa com | `409` |
| Mensagem | `Choque de horário com <código da turma> (<dia> <hora_inicio>–<hora_fim>)` |

---

## RN-4 📅 Prazo

Nenhuma matrícula é criada ou trancada fora da janela do período letivo ativo:
`inicio_matricula <= agora <= fim_matricula`. Os limites são **inclusivos** e a comparação
usa o fuso `America/Sao_Paulo`.

| | |
| --- | --- |
| Recusa com | `422` |
| Mensagem | `Fora do prazo de matrícula do período <código>` |

A janela é configurável pelo administrador em um único lugar (`PeriodoLetivo`).

---

## RN-5 🧮 Créditos do semestre

O total de créditos do semestre é a soma dos créditos das disciplinas com matrícula
**`CONFIRMADA`** no período ativo. `TRANCADA` e `REJEITADA` **não** contam.

| Limite | Valor | Efeito |
| --- | --- | --- |
| Máximo por período | 24 | Ultrapassar recusa com `422` `Limite de créditos atingido (X/24)` |
| Mínimo para aluno regular | 12 | Abaixo disso o aluno é "irregular" — **avisa**, não bloqueia |

Aluno sem nenhuma matrícula tem **zero** créditos.

---

## RN-6 🔐 Autorização

- O aluno só lê e altera matrículas cujo `aluno_id` é o dele. Acesso a matrícula de outro
  aluno responde `403` — nunca `404`, e nunca com o dado vazado.
- O coordenador lê e altera apenas turmas do curso que coordena.
- O administrador não tem restrição de escopo.
- Toda rota exige token válido, exceto `POST /auth/login`. Sem token: `401`.

---

## RN-7 🚫 Duplicidade

Um aluno não pode ter duas matrículas simultâneas na mesma turma em estado `PENDENTE` ou
`CONFIRMADA`.

| | |
| --- | --- |
| Recusa com | `409` |
| Mensagem | `Matrícula já existente para esta turma` |

Rematricular-se numa turma já trancada cria uma **nova** matrícula — não reativa a antiga.

---

## 🔢 Ordem de avaliação

Quando mais de uma regra falha, o sistema responde **a primeira que falhar** nesta ordem:

```text
RN-4 prazo → RN-6 autorização → RN-7 duplicidade → RN-2 pré-requisito
  → RN-3 choque → RN-5 créditos → RN-1 vaga
```

A ordem não é detalhe de implementação: ela existe para que um pedido que viola duas
regras tenha **um** resultado esperado, e o teste possa afirmá-lo.

RN-1 é a última porque é a única que altera contador — a vaga só se decrementa depois de
todo o resto estar válido.

---

## 🚦 Estados da matrícula

As regras acima falam de estado o tempo todo; esta é a referência rápida.

| Estado | Significado | Ocupa vaga? | Conta créditos? |
| --- | --- | :---: | :---: |
| ⏳ `PENDENTE` | Pedido criado, validações não concluídas | ✅ | ❌ |
| ✅ `CONFIRMADA` | Matrícula válida e ativa | ✅ | ✅ |
| ❌ `REJEITADA` | Alguma regra recusou o pedido | ❌ | ❌ |
| 🔒 `TRANCADA` | O aluno desistiu dentro do prazo | ❌ | ❌ |

Transições válidas: `PENDENTE → CONFIRMADA`, `PENDENTE → REJEITADA`,
`CONFIRMADA → TRANCADA`. Qualquer outra falha com `409`. Ao trancar, a vaga volta para a
turma na mesma transação.

---

## 📨 Formato da recusa

Toda recusa sai neste formato, com o `RN-n` no campo `regra`:

```json
{
  "erro": {
    "codigo": "CHOQUE_DE_HORARIO",
    "regra": "RN-3",
    "mensagem": "Choque de horário com ENG-204 (seg 19:00–20:40)"
  }
}
```
