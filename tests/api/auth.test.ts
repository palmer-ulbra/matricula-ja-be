import request from 'supertest';
import { afterAll, expect, test } from 'vitest';
import { app } from '../../src/app';
import { db } from '../../src/db';

const api = request(app);
afterAll(async () => {
  await db.end();
});

test('POST /auth/login com credencial certa devolve token', async () => {
  const r = await api.post('/api/v1/auth/login').send({ email: 'bruno@ulbra.br', senha: 'senha123' });
  expect(r.status).toBe(200);
  expect(r.body.token).toEqual(expect.any(String));
  expect(r.body.usuario).toMatchObject({ id: 2, perfil: 'ALUNO' });
  expect(r.body.usuario).not.toHaveProperty('senha_hash');
});

test('POST /auth/login com senha errada responde 401 com a mesma mensagem', async () => {
  const r = await api.post('/api/v1/auth/login').send({ email: 'bruno@ulbra.br', senha: 'errada' });
  expect(r.status).toBe(401);
  expect(r.body.erro.mensagem).toBe('E-mail ou senha inválidos');
});

test('POST /auth/login com e-mail que não existe responde 401 com a mesma mensagem', async () => {
  const r = await api.post('/api/v1/auth/login').send({ email: 'ninguem@ulbra.br', senha: 'senha123' });
  expect(r.status).toBe(401);
  expect(r.body.erro.mensagem).toBe('E-mail ou senha inválidos');
});

test('POST /auth/login sem senha responde 400', async () => {
  const r = await api.post('/api/v1/auth/login').send({ email: 'bruno@ulbra.br' });
  expect(r.status).toBe(400);
});

test('POST /auth/login e-mail mal formado responde 400', async () => {
  const r = await api.post('/api/v1/auth/login').send({ email: 'bruno', senha: 'senha123' });
  expect(r.status).toBe(400);
});

// Parte C — vermelho: a API responde 500
test('POST /auth/login com JSON quebrado responde 400', async () => {
  const r = await api.post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"email": ');
  expect(r.status).toBe(400);
});
