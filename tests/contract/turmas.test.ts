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

test('GET /turmas cumpre o contrato', async () => {
  const r = await api.get('/api/v1/turmas').query({ tamanho: 2 }).set('Authorization', token);
  expect(r.status).toBe(200);
  expect(validar('PaginaDeTurmas', r.body)).toEqual([]);
});
