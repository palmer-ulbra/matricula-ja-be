import type { PoolClient } from 'pg';
import { emTransacao } from '../db.js';
import { ErroDaApi, naoEncontrado, semPermissao } from '../erros.js';
import type { PeriodoLetivo, Turma, Usuario } from '../tipos.js';
import {
  MAX_CREDITOS,
  creditosDoSemestre,
  dentroDoPrazo,
  erroChoque,
  erroDuplicidade,
  erroForaDoPrazo,
  erroLimiteDeCreditos,
  erroSemVaga,
  horariosChocam,
  temVaga,
} from './regras.js';

type TurmaComDisciplina = Turma & { creditos: number; disciplina_codigo: string; disciplina_nome: string };

async function periodoAtivo(c: PoolClient): Promise<PeriodoLetivo> {
  const { rows } = await c.query<PeriodoLetivo>('select * from periodo_letivo where ativo limit 1');
  if (!rows[0]) throw naoEncontrado('Período letivo ativo');
  return rows[0];
}

/**
 * Cria a matrícula aplicando RN-1..RN-7 na ordem de avaliação da especificação §5:
 * RN-4 → RN-6 → RN-7 → RN-2 → RN-3 → RN-5 → RN-1.
 * Tudo numa transação: a vaga só muda depois de todas as regras passarem.
 */
export function criarMatricula(usuario: Usuario, turmaId: number, agora = new Date()) {
  return emTransacao(async (c) => {
    // RN-4 · prazo
    const periodo = await periodoAtivo(c);
    if (!dentroDoPrazo(periodo, agora)) throw erroForaDoPrazo(periodo);

    // RN-6 · autorização: o aluno só matricula a si mesmo. O id vem do token, nunca do corpo.

    // Trava a linha da turma: sem isso duas requisições simultâneas passam pela mesma vaga.
    const { rows } = await c.query<TurmaComDisciplina>(
      `select t.*, d.creditos, d.codigo as disciplina_codigo, d.nome as disciplina_nome
         from turma t join disciplina d on d.id = t.disciplina_id
        where t.id = $1 for update of t`,
      [turmaId],
    );
    const turma = rows[0];
    if (!turma) throw naoEncontrado('Turma');
    if (turma.periodo_letivo_id !== periodo.id) throw erroForaDoPrazo(periodo);
    if (turma.situacao === 'FECHADA') throw erroSemVaga();

    // RN-7 · duplicidade
    const jaTem = await c.query(
      `select 1 from matricula
        where aluno_id = $1 and turma_id = $2 and estado in ('PENDENTE', 'CONFIRMADA')`,
      [usuario.id, turmaId],
    );
    if (jaTem.rowCount) throw erroDuplicidade();

    // RN-3 · choque de horário
    const ativas = await c.query<Turma & { creditos: number }>(
      `select t.*, d.creditos
         from matricula m
         join turma t on t.id = m.turma_id
         join disciplina d on d.id = t.disciplina_id
        where m.aluno_id = $1
          and m.estado in ('PENDENTE', 'CONFIRMADA')
          and t.periodo_letivo_id = $2`,
      [usuario.id, periodo.id],
    );
    const conflito = ativas.rows.find((t) => {
      return horariosChocam(t, turma);
    });
    if (conflito) throw erroChoque(conflito);

    // RN-5 · créditos do semestre
    const total =
      creditosDoSemestre(
        ativas.rows.map((t) => {
          return { estado: 'CONFIRMADA' as const, creditos: t.creditos };
        }),
      ) + turma.creditos;
    if (total > MAX_CREDITOS) throw erroLimiteDeCreditos(total);

    // RN-1 · vaga (última, porque é a única que altera contador)
    if (!temVaga(turma)) throw erroSemVaga();

    const criada = await c.query(
      `insert into matricula (aluno_id, turma_id, estado) values ($1, $2, 'CONFIRMADA') returning *`,
      [usuario.id, turmaId],
    );
    await c.query('update turma set vagas_ocupadas = vagas_ocupadas + 1 where id = $1', [turmaId]);

    return criada.rows[0];
  });
}

/** CONFIRMADA → TRANCADA. A vaga volta para a turma na mesma transação (especificação §4). */
export function trancarMatricula(usuario: Usuario, matriculaId: number, agora = new Date()) {
  return emTransacao(async (c) => {
    // RN-4 · prazo
    const periodo = await periodoAtivo(c);
    if (!dentroDoPrazo(periodo, agora)) throw erroForaDoPrazo(periodo);

    const { rows } = await c.query('select * from matricula where id = $1 for update', [matriculaId]);
    const matricula = rows[0];
    if (!matricula) throw naoEncontrado('Matrícula');

    // RN-6 · trancar é do dono, e só dele — nem coordenação tranca por cima.
    if (matricula.aluno_id !== usuario.id) throw semPermissao();

    if (matricula.estado !== 'CONFIRMADA') {
      throw new ErroDaApi(
        409,
        'TRANSICAO_INVALIDA',
        null,
        `Transição inválida: ${matricula.estado} → TRANCADA`,
      );
    }

    const trancada = await c.query(
      `update matricula set estado = 'TRANCADA', atualizada_em = now() where id = $1 returning *`,
      [matriculaId],
    );
    await c.query(
      'update turma set vagas_ocupadas = greatest(vagas_ocupadas - 1, 0) where id = $1',
      [matricula.turma_id],
    );

    return trancada.rows[0];
  });
}
