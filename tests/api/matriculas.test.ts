import request from 'supertest';
import { afterAll, expect, test } from 'vitest';
import { app } from '../../src/app';
import { assinarToken } from '../../src/auth';
import { db } from '../../src/db';

// Nível de sistema: entra pela borda HTTP, como o navegador entraria.
// Mesmo defeito do teste de integração, um degrau acima — e bem mais lento.
const tokenDoBruno = `Bearer ${assinarToken({ id: 2, perfil: 'ALUNO', curso: 'ADS' })}`;

afterAll(async () => {
  await db.query("delete from matricula where aluno_id = 2 and estado in ('PENDENTE', 'CONFIRMADA')");
  await db.query(
    `update turma t set vagas_ocupadas =
       (select count(*) from matricula m where m.turma_id = t.id and m.estado in ('PENDENTE','CONFIRMADA'))`,
  );
  await db.end();
});

test('RN-2 · POST /matriculas recusa disciplina sem pré-requisito', async () => {
  const { rows } = await db.query<{ id: number }>("select id from turma where codigo = 'BD-201-A'");

  const resposta = await request(app)
    .post('/api/v1/matriculas')
    .set('Authorization', tokenDoBruno)
    .send({ turma_id: rows[0].id });

  expect(resposta.status).toBe(422);
  expect(resposta.body.erro).toMatchObject({ codigo: 'PRE_REQUISITO_NAO_CUMPRIDO', regra: 'RN-2' });
});
