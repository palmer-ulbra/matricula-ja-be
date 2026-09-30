import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { app } from '../../src/app';
import { db } from '../../src/db';

const api = request(app);
const entrar = async (email: string) => {
  const r = await api.post('/api/v1/auth/login').send({ email, senha: 'senha123' });
  return `Bearer ${r.body.token}`;
};

let bruno: string;
let marina: string;
let matriculaId: number;
beforeAll(async () => {
  bruno = await entrar('bruno@ulbra.br');
  marina = await entrar('marina@ulbra.br');
});

beforeEach(async () => {
  const { rows } = await db.query("select id from turma where codigo = 'ENG-101-A'");
  const r = await api.post('/api/v1/matriculas').set('Authorization', bruno).send({ turma_id: rows[0].id });
  matriculaId = r.body.id;
});

afterEach(async () => {
  await db.query('delete from matricula where aluno_id = 2');
  await db.query(`update turma t set vagas_ocupadas = (select count(*) from matricula m
    where m.turma_id = t.id and m.estado in ('PENDENTE','CONFIRMADA'))`);
});
afterAll(async () => {
  await db.end();
});

test('DELETE /matriculas/:id tranca e devolve TRANCADA', async () => {
  const r = await api.delete(`/api/v1/matriculas/${matriculaId}`).set('Authorization', bruno);
  expect(r.status).toBe(200);
  expect(r.body.estado).toBe('TRANCADA');
});

test('trancar duas vezes responde 409', async () => {
  await api.delete(`/api/v1/matriculas/${matriculaId}`).set('Authorization', bruno);
  const r = await api.delete(`/api/v1/matriculas/${matriculaId}`).set('Authorization', bruno);
  expect(r.status).toBe(409);
  expect(r.body.erro.codigo).toBe('TRANSICAO_INVALIDA');
});

test('trancar a matrícula de outro aluno responde 403', async () => {
  const r = await api.delete(`/api/v1/matriculas/${matriculaId}`).set('Authorization', marina);
  expect(r.status).toBe(403);
});

test('trancar sem token responde 401', async () => {
  const r = await api.delete(`/api/v1/matriculas/${matriculaId}`);
  expect(r.status).toBe(401);
});

// Parte C — vermelho: a API responde 500
test('DELETE /matriculas/abc não responde 500', async () => {
  const r = await api.delete('/api/v1/matriculas/abc').set('Authorization', bruno);
  expect(r.status).toBe(404);
});
