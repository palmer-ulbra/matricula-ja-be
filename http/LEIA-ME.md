# 📮 Requisições prontas (REST Client)

Aqui ficam requisições para chamar a API direto do VS Code, sem Postman e sem criar conta.

## Como usar

1. Instale a extensão **REST Client** (o VS Code sugere sozinho ao abrir o projeto).
2. Suba a API: `npm run dev` (fica em `http://localhost:3000`).
3. Abra um arquivo `.http` desta pasta.
4. Clique em **Send Request**, que aparece em cima de cada requisição.
5. A resposta abre numa aba ao lado.

## Os arquivos, na ordem

| Arquivo | O que tem |
| --- | --- |
| `01-primeiros-passos.http` | A API está de pé? Como fazer login |
| `02-turmas.http` | Listar e ver turmas: os campos que o contrato promete |
| `03-matriculas.http` | Matricular, listar e trancar (aluno) |
| `04-erros.http` | Como a API responde quando algo dá errado |
| `05-coordenacao.http` | O que só a coordenação pode fazer |

## Regras do jogo

- Linhas com `#` são comentários.
- `###` separa uma requisição da outra.
- Cada arquivo começa com um **login**. Rode o login primeiro; as outras
  requisições do arquivo reaproveitam o token dele.
- Todos os usuários do seed têm a senha `senha123`.
