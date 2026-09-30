import request from "supertest";
import { afterAll, beforeAll, expect, test } from "vitest";
import app from "../../src/app";
import { db } from "../../src/db";

const api = request(app);

let token: string;

beforeAll(async () => {
  const r = await api
    .post("/api/v1/auth/login")
    .send({ email: "bruno@ulbra.br", senha: "senha123" });
  token = `Bearer ${r.body.token}`;
});

afterAll(async () => {
  await db.end();
});

test("GET /health responde 200", async () => {
  const r = await api.get("/api/v1/health");

  expect(r.status).toBe(200);
  expect(r.body).toEqual({ status: "ok" });
});

test("GET /turmas sem token responde 401", async () => {
  const r = await api.get("/api/v1/turmas");
  expect(r.status).toBe(401);
  expect(r.body.erro).toEqual({
    codigo: "NAO_AUTENTICADO",
    regra: "RN-6",
    mensagem: "Token ausente ou inválido",
  });
});

test("GET /turmas com token falso responde 401", async () => {
  const r = await api
    .get("/api/v1/turmas")
    .set("Authorization", "Bearer abc.def.ghi");
  expect(r.status).toBe(401);
});

test("GET /turmas?busca= filtra e calcula vagas restantes", async () => {
  const r = await api
    .get("/api/v1/turmas")
    .query({ busca: "BD-101" })
    .set("Authorization", token);
  expect(r.status).toBe(200);
  const resumo = r.body.itens.map(
    (t: { codigo: string; vagas_restantes: number }) => [
      t.codigo,
      t.vagas_restantes,
    ],
  );
  expect(resumo).toEqual([
    ["BD-101-A", 30],
    ["BD-101-B", 0],
  ]);
});
