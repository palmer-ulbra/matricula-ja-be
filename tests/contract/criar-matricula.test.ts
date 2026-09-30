import request from 'supertest';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { app } from '../../src/app';
import { db } from '../../src/db';
import { validar } from './contrato';

const api = request(app);
let bruno: string;
let turmaId: number;

beforeAll(async () => {
  const r = await api.post('/api/v1/auth/login').send({ email: 'bruno@ulbra.br', senha: 'senha123' });
  bruno = `Bearer ${r.body.token}`;
  const { rows } = await db.query("select id from turma where codigo = 'ENG-101-A'");
  turmaId = rows[0].id;
});

afterEach(async () => {
  await db.query('delete from matricula where aluno_id = 2');
  await db.query(`update turma t set vagas_ocupadas = (select count(*) from matricula m
    where m.turma_id = t.id and m.estado in ('PENDENTE','CONFIRMADA'))`);
});

afterAll(async () => {
  await db.end();
});

// O consumidor que já existe manda o corpo da 1.0.0. Ele precisa continuar sendo aceito.
test('POST /matriculas aceita o pedido da 1.0.0 e responde no contrato', async () => {
  const pedido = { turma_id: turmaId };
  expect(validar('NovaMatricula', pedido)).toEqual([]);

  const r = await api.post('/api/v1/matriculas').set('Authorization', bruno).send(pedido);
  expect(r.status).toBe(201);
  expect(validar('Matricula', r.body)).toEqual([]);
});
