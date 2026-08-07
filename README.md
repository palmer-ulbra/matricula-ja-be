# 🎓 MatriculaJá — API

Backend da aplicação-base da disciplina **Qualidade e Testes de Software** (ULBRA 2026/2).
Node + TypeScript + Express + Postgres com SQL cru (sem ORM).

A especificação é o oráculo: `qualidade-e-testes-de-software/app/especificacao.md`.
Quando o código e a spec discordarem, a spec está certa.

## Acesso (produção)

|             | URL                                       |
| ----------- | ----------------------------------------- |
| App (front) | https://matricula-ja.vercel.app/login     |
| API         | https://matricula-ja-be.vercel.app/api/v1 |

Entre com `marina@ulbra.br` / `senha123` (demais credenciais abaixo).

## Rodar local

```bash
cp .env.example .env          # ajuste DATABASE_URL se preciso
npm install
npm run db:reset              # cria o esquema e o seed (destrutivo)
npm run dev                   # http://localhost:3000/api/v1
```

Precisa de um Postgres. Com Docker:

```bash
docker run -d --name matriculaja-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=matriculaja postgres:17
```

## Banco

| Arquivo                 | O que faz                                                  |
| ----------------------- | ---------------------------------------------------------- |
| `db/01-schema.sql`      | DDL, com as restrições que a spec §3 exige no banco        |
| `db/02-seed.sql`        | Seed determinístico da spec §10 — **testes dependem dele** |
| `db/03-seed-volume.sql` | +300 disciplinas para o teste de carga da Aula 14          |

Aplique com `npm run db:reset` (local) ou colando o conteúdo no **SQL Editor** do Supabase.
Não há API de seed que valha mais que um `.sql` — a API do Supabase é PostgREST, usá-la
para semear seria mais código para o mesmo resultado.

### Credenciais do seed

Senha de todo mundo: `senha123`.

| E-mail                             | Perfil                                            |
| ---------------------------------- | ------------------------------------------------- |
| `marina@ulbra.br`                  | Aluno (aprovada em BD I — passa no pré-requisito) |
| `bruno@ulbra.br`                   | Aluno (reprovado em BD I — caso de RN-2)          |
| `carla@ulbra.br`, `diego@ulbra.br` | Alunos (enchem a turma `BD-101-B`)                |
| `coordenacao@ulbra.br`             | Coordenador do curso ADS                          |
| `admin@ulbra.br`                   | Administrador                                     |

Casos plantados no seed: `BD-101-B` está **cheia** (RN-1), `WEB-101-B` choca com
`QTS-101-A` na segunda (RN-3), e o período `2026/1` está encerrado (RN-4).

## Supabase

Só o Postgres — a autenticação é do próprio app (JWT + bcrypt). Basta apontar o
`DATABASE_URL` para lá e rodar os `.sql`.

> Em função serverless use o **transaction pooler** (porta `6543`), não a conexão direta
> (`5432`): cada invocação abre conexão e a direta esgota o banco.

## Vercel

Produção: **https://matricula-ja-be.vercel.app/api** (rotas em `/api/v1/...`).

`api/index.ts` exporta o app Express e o `vercel.json` manda tudo para ele.
Variáveis de ambiente do projeto: `DATABASE_URL` (pooler) e `JWT_SECRET`.

## Estrutura

```
api/index.ts             entrada serverless
src/app.ts               express + tratamento de erro no formato da spec §6
src/server.ts            listen local
src/db.ts                Pool + emTransacao()
src/auth.ts              JWT, exigeAuth, exigePerfil
src/erros.ts             ErroDaApi
src/dominio/regras.ts    RN-1..RN-7 como funções puras
src/dominio/matricula.ts criar e trancar, em transação, na ordem de avaliação da spec §5
src/servico-historico.ts dublê do serviço externo (spec §7)
src/rotas.ts             todos os endpoints
```

## Testes

Não vêm no repositório de propósito: escrevê-los é o trabalho das aulas 2, 6, 8, 9, 10,
11, 12, 14, 15 e 16.

oi
