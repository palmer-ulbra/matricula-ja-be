import { afterAll, expect, test } from 'vitest';
import { db } from '../../src/db';
import { criarMatricula } from '../../src/dominio/matricula';
import type { Usuario } from '../../src/tipos';

// Nível de integração: o domínio conversando com o banco e com o serviço de histórico.
// Bruno (aluno 2) está REPROVADO em BD-101 no seed — é o caso de RN-2.
const bruno: Usuario = { id: 2, perfil: 'ALUNO', curso: 'ADS' };

const turmaPorCodigo = async (codigo: string) => {
  const { rows } = await db.query<{ id: number }>('select id from turma where codigo = $1', [codigo]);
  if (!rows[0]) throw new Error(`Turma ${codigo} não existe — rode "npm run db:reset"`);
  return rows[0].id;
};

afterAll(async () => {
  // O defeito de RN-2 deixa a matrícula entrar. Limpa para o seed voltar ao estado dele.
  await db.query("delete from matricula where aluno_id = 2 and estado in ('PENDENTE', 'CONFIRMADA')");
  await db.query(
    `update turma t set vagas_ocupadas =
       (select count(*) from matricula m where m.turma_id = t.id and m.estado in ('PENDENTE','CONFIRMADA'))`,
  );
  await db.end();
});

test('RN-2 · matrícula em BD II sem aprovação em BD I é recusada', async () => {
  const turmaBD2 = await turmaPorCodigo('BD-201-A');

  await expect(criarMatricula(bruno, turmaBD2)).rejects.toMatchObject({
    codigo: 'PRE_REQUISITO_NAO_CUMPRIDO',
  });
});
