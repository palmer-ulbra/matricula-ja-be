import request from "supertest";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import app from "../../src/app";
import { db } from "../../src/db";

const api = request(app);
const entrar = async (email: string) => {
  const r = await api
    .post("/api/v1/auth/login")
    .send({ email, senha: "senha123" });
  return `Bearer ${r.body.token}`;
};
const turma = async (codigo: string) => {
  const r = await db.query("select id from turma where codigo = $1", [codigo]);
  return r.rows[0].id as number;
};

let bruno: string;
let coordenacao: string;
beforeAll(async () => {
  bruno = await entrar("bruno@ulbra.br");
  coordenacao = await entrar("coordenacao@ulbra.br");
});

// O Bruno começa o seed sem matrícula: tudo dele foi criado por um teste.
afterEach(async () => {
  await db.query("delete from matricula where aluno_id = 2");
  await db.query(`update turma t set vagas_ocupadas = (select count(*) from matricula m
    where m.turma_id = t.id and m.estado in ('PENDENTE','CONFIRMADA'))`);
});

afterAll(async () => {
  await db.end();
});

test("POST /matriculas válido responde 201 e ocupa a vaga", async () => {
  const id = await turma("ENG-101-A");
  const r = await api
    .post("/api/v1/matriculas")
    .set("Authorization", bruno)
    .send({ turma_id: id });
  expect(r.status).toBe(201);
  expect(r.body).toMatchObject({
    aluno_id: 2,
    turma_id: id,
    estado: "CONFIRMADA",
  });

  const t = await api.get(`/api/v1/turmas/${id}`).set("Authorization", bruno);
  expect(t.body.vagas_restantes).toBe(29);
});

test("POST /matriculas com corpo vazio responde 400", async () => {
  const r = await api
    .post("/api/v1/matriculas")
    .set("Authorization", bruno)
    .send({});
  expect(r.status).toBe(400);
  expect(r.body.erro.codigo).toBe("CORPO_INVALIDO");
});

test("POST /matriculas com turma_id como texto responde 400", async () => {
  const r = await api
    .post("/api/v1/matriculas")
    .set("Authorization", bruno)
    .send({ turma_id: "12" });
  expect(r.status).toBe(400);
  expect(r.body.erro.codigo).toBe("CORPO_INVALIDO");
});

test("POST /matriculas com turma_id negativo responde 400", async () => {
  const r = await api
    .post("/api/v1/matriculas")
    .set("Authorization", bruno)
    .send({ turma_id: -1 });
  expect(r.status).toBe(400);
  expect(r.body.erro.codigo).toBe("CORPO_INVALIDO");
});

test("POST /matriculas com turma_id decimal responde 400", async () => {
  const r = await api
    .post("/api/v1/matriculas")
    .set("Authorization", bruno)
    .send({ turma_id: 1.5 });
  expect(r.status).toBe(400);
  expect(r.body.erro.codigo).toBe("CORPO_INVALIDO");
});

test("POST /matriculas pelo coordenador responde 403", async () => {
  const r = await api
    .post("/api/v1/matriculas")
    .set("Authorization", coordenacao)
    .send({ turma_id: await turma("ENG-101-A") });
  expect(r.status).toBe(403);
  expect(r.body.erro).toMatchObject({ codigo: "SEM_PERMISSAO", regra: "RN-6" });
});

test("POST /matriculas em turma cheia responde 409 com a mensagem da spec", async () => {
  const r = await api
    .post("/api/v1/matriculas")
    .set("Authorization", bruno)
    .send({ turma_id: await turma("BD-101-B") });
  expect(r.status).toBe(409);
  expect(r.body.erro).toEqual({
    codigo: "TURMA_SEM_VAGA",
    regra: "RN-1",
    mensagem: "Turma sem vaga disponível",
  });
});

test("GET /turmas/:id com id que não é número não responde 500", async () => {
  const r = await api.get("/api/v1/turmas/abc").set("Authorization", bruno);
  expect(r.status).toBe(404);
});
