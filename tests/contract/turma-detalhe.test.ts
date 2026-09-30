import request from 'supertest';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { app } from '../../src/app';
import { db } from '../../src/db';
import { validar } from './contrato';

const api = request(app);
let token: string;

beforeAll(async () => {
  const r = await api.post('/api/v1/auth/login').send({ email: 'bruno@ulbra.br', senha: 'senha123' });
  token = `Bearer ${r.body.token}`;
});

afterAll(async () => {
  await db.end();
});

test('GET /turmas/:id cumpre o contrato', async () => {
  const { rows } = await db.query("select id from turma where codigo = 'ENG-101-A'");
  const r = await api.get(`/api/v1/turmas/${rows[0].id}`).set('Authorization', token);
  expect(r.status).toBe(200);
  expect(validar('TurmaDetalhe', r.body)).toEqual([]);
});

test('GET /turmas/:id inexistente devolve o Erro do contrato', async () => {
  const r = await api.get('/api/v1/turmas/99999').set('Authorization', token);
  expect(r.status).toBe(404);
  expect(validar('Erro', r.body)).toEqual([]);
});
