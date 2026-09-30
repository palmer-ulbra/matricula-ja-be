import request from 'supertest';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { app } from '../../src/app';
import { db } from '../../src/db';
import { validar } from './contrato';

const api = request(app);
let bruno: string;

beforeAll(async () => {
  const r = await api.post('/api/v1/auth/login').send({ email: 'bruno@ulbra.br', senha: 'senha123' });
  bruno = `Bearer ${r.body.token}`;
});

afterEach(async () => {
  await db.query('delete from matricula where aluno_id = 2');
  await db.query(`update turma t set vagas_ocupadas = (select count(*) from matricula m
    where m.turma_id = t.id and m.estado in ('PENDENTE','CONFIRMADA'))`);
});

afterAll(async () => {
  await db.end();
});

test('DELETE /matriculas/:id responde no contrato, sucesso e recusa', async () => {
  const { rows } = await db.query("select id from turma where codigo = 'ENG-101-A'");
  const criada = await api.post('/api/v1/matriculas').set('Authorization', bruno).send({ turma_id: rows[0].id });

  const r = await api.delete(`/api/v1/matriculas/${criada.body.id}`).set('Authorization', bruno);
  expect(r.status).toBe(200);
  expect(validar('Matricula', r.body)).toEqual([]);

  const deNovo = await api.delete(`/api/v1/matriculas/${criada.body.id}`).set('Authorization', bruno);
  expect(deNovo.status).toBe(409);
  expect(validar('Erro', deNovo.body)).toEqual([]);
});
