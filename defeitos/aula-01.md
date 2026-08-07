# 🐛 Defeitos — Aula 1

Registros feitos a partir do dossiê de relatos da primeira semana do MatriculaJá no ar.
São os **exemplos de referência do formato**: todo registro do semestre tem estes seis
campos, e um registro sem passos e sem dados não é reproduzível — logo, não é corrigido.

Oráculo de todos eles: `especificacao.md`. Quando o código e a spec discordam, a spec
está certa.

---

## D-01 · Matrícula aceita sem o pré-requisito cumprido

Origem: relato **#1073**.

| Campo | Conteúdo |
| --- | --- |
| 📌 **Título** | Aluno reprovado em Banco de Dados I consegue se matricular em Banco de Dados II |
| 🎯 **Resultado esperado** | RN-2: a matrícula é recusada com `422` `PRE_REQUISITO_NAO_CUMPRIDO` e a mensagem `Pré-requisito não cumprido: BD-101 Banco de Dados I` |
| 👀 **Resultado obtido** | `201 Created` — a matrícula é criada e passa a ocupar vaga |
| 🔁 **Passos para reproduzir** | 1. Autenticar como `bruno@ulbra.br` / `senha123`<br>2. `GET /api/v1/turmas` e localizar a turma de Banco de Dados II<br>3. `POST /api/v1/matriculas` com o `turma_id` dessa turma<br>4. Ler o status da resposta |
| 📦 **Dados usados** | Aluno `bruno@ulbra.br`, que tem BD I no histórico com situação **reprovado**; turma `BD-201-A`, cuja disciplina exige `BD-101` como pré-requisito |
| 🧪 **Evidência** | Corpo e status da resposta do `POST`, colados abaixo |

```json
HTTP/1.1 201 Created

{ "id": 41, "turma_id": 7, "estado": "CONFIRMADA" }
```

> Por que este é um defeito e não uma reclamação: existe regra escrita (RN-2), o sistema
> não a cumpriu, e a diferença entre esperado e obtido é verificável por qualquer pessoa
> que repita os quatro passos.

---

## D-02 · Matrícula de outro aluno visível trocando o id na URL

Origem: relato **#1088**.

| Campo | Conteúdo |
| --- | --- |
| 📌 **Título** | `GET /api/v1/matriculas/{id}` devolve a matrícula de outro aluno |
| 🎯 **Resultado esperado** | RN-6: o aluno só acessa os próprios dados; matrícula de terceiro responde `403` |
| 👀 **Resultado obtido** | `200 OK` com a matrícula da Carla, incluindo turma e disciplina |
| 🔁 **Passos para reproduzir** | 1. Autenticar como `marina@ulbra.br` e guardar o token<br>2. `GET /api/v1/matriculas` e anotar o id de uma matrícula própria<br>3. Repetir a chamada trocando o id por um vizinho (`id - 1`)<br>4. Comparar o `aluno_id` do retorno com o do token |
| 📦 **Dados usados** | Token da Marina; matrícula id `12`, que pertence à Carla |
| 🧪 **Evidência** | Resposta do passo 3 com `aluno_id` diferente do dono do token |

> ⚠️ O mecanismo (autorização por objeto) é conteúdo da **Aula 15**. Aqui o registro é o
> artefato — descrever bem o defeito não depende de saber consertá-lo.

---

## Não são defeitos — e por que

Nem todo relato vira registro. Estes três ficaram de fora de propósito:

| Relato | Por que não vira registro de defeito |
| --- | --- |
| **#1051** "Erro inesperado. Código 409" | O sistema acertou: 409 é a recusa correta de matrícula duplicada (RN-7). O problema é a mensagem — é **incidente sem falha**, e vira melhoria de usabilidade |
| **#1042** "ficou girando, na sexta vez funcionou" | Vago demais. Sem passos e sem dados não é reproduzível. Antes de registrar, é preciso dizer **o que medir** para provar que existe |
| **#1067** "demora no celular" | Idem — só vira registro com número: 0,8s em homologação (12 disciplinas) contra 6,4s em produção (317). O requisito de desempenho está na spec §9 |

---

## O formato, para copiar

```markdown
## D-NN · <título curto>

| Campo | Conteúdo |
| --- | --- |
| 📌 **Título** | o comportamento errado, em uma linha |
| 🎯 **Resultado esperado** | o que a regra manda acontecer — cite a RN |
| 👀 **Resultado obtido** | o que aconteceu de fato |
| 🔁 **Passos para reproduzir** | numerados, do zero até a falha |
| 📦 **Dados usados** | os dados exatos que produzem o problema |
| 🧪 **Evidência** | saída do `npm test`, resposta da API ou print |
```

**Está completo quando** outra pessoa reproduz a falha lendo só o documento, sem
perguntar nada a quem escreveu.
