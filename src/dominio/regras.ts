import { ErroDaApi } from '../erros.js';
import type { EstadoMatricula, PeriodoLetivo, Turma } from '../tipos.js';

export const MAX_CREDITOS = 24;
export const MIN_CREDITOS_REGULAR = 12;

/** `19:00:00` do Postgres vira `19:00` nas mensagens. */
export const hhmm = (hora: string) => hora.slice(0, 5);

// ── RN-4 · Prazo ────────────────────────────────────────────────────────────
// Limites inclusivos. As colunas são timestamptz, então a comparação de instantes
// já resolve o fuso America/Sao_Paulo sem conta manual.
export const dentroDoPrazo = (p: PeriodoLetivo, agora: Date) =>
  agora >= p.inicio_matricula && agora <= p.fim_matricula;

export const erroForaDoPrazo = (p: PeriodoLetivo) =>
  new ErroDaApi(422, 'FORA_DO_PRAZO', 'RN-4', `Fora do prazo de matrícula do período ${p.codigo}`);

// ── RN-7 · Duplicidade ──────────────────────────────────────────────────────
export const estadoOcupaTurma = (e: EstadoMatricula) => e === 'PENDENTE' || e === 'CONFIRMADA';

export const erroDuplicidade = () =>
  new ErroDaApi(409, 'MATRICULA_DUPLICADA', 'RN-7', 'Matrícula já existente para esta turma');

// ── RN-2 · Pré-requisito ────────────────────────────────────────────────────
export const erroPreRequisito = (codigo: string, nome: string) =>
  new ErroDaApi(422, 'PRE_REQUISITO_NAO_CUMPRIDO', 'RN-2', `Pré-requisito não cumprido: ${codigo} ${nome}`);

// ── RN-3 · Choque de horário ────────────────────────────────────────────────
/** Mesmo dia e interseção de intervalo. Fim é exclusivo: 20:40 encosta em 20:40 sem chocar. */
export const horariosChocam = (
  a: Pick<Turma, 'dia_semana' | 'hora_inicio' | 'hora_fim'>,
  b: Pick<Turma, 'dia_semana' | 'hora_inicio' | 'hora_fim'>,
) => a.dia_semana === b.dia_semana && a.hora_inicio < b.hora_fim && b.hora_inicio < a.hora_fim;

export const erroChoque = (t: Pick<Turma, 'codigo' | 'dia_semana' | 'hora_inicio' | 'hora_fim'>) =>
  new ErroDaApi(
    409,
    'CHOQUE_DE_HORARIO',
    'RN-3',
    `Choque de horário com ${t.codigo} (${t.dia_semana} ${hhmm(t.hora_inicio)}–${hhmm(t.hora_fim)})`,
  );

// ── RN-5 · Créditos do semestre ─────────────────────────────────────────────
export const creditosDoSemestre = (matriculas: { estado: EstadoMatricula; creditos: number }[]) =>
  matriculas.reduce((total, m) => total + m.creditos, 0);

export const alunoIrregular = (creditos: number) => creditos < MIN_CREDITOS_REGULAR;

export const erroLimiteDeCreditos = (total: number) =>
  new ErroDaApi(422, 'LIMITE_DE_CREDITOS', 'RN-5', `Limite de créditos atingido (${total}/${MAX_CREDITOS})`);

// ── RN-1 · Vaga ─────────────────────────────────────────────────────────────
export const temVaga = (t: Pick<Turma, 'vagas_totais' | 'vagas_ocupadas'>) =>
  t.vagas_ocupadas < t.vagas_totais;

export const erroSemVaga = () => new ErroDaApi(409, 'TURMA_SEM_VAGA', 'RN-1', 'Turma sem vaga disponível');
