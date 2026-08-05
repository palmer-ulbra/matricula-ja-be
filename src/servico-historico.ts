import { db } from './db.js';
import { ErroDaApi } from './erros.js';

const TIMEOUT_MS = 3000;

/**
 * Serviço externo simulado (especificação §7).
 * Em "produção" seria o sistema acadêmico; aqui é um dublê que lê a tabela local.
 * Ele é lento, externo e pode falhar — os três motivos para substituí-lo por um dublê
 * nos testes (Aula 6).
 */
export async function consultarAprovacao(alunoId: number, disciplinaId: number): Promise<boolean> {
  const consulta = db
    .query('select 1 from historico where aluno_id = $1 and disciplina_id = $2 and situacao = $3', [
      alunoId,
      disciplinaId,
      'APROVADO',
    ])
    .then((r) => {
      return r.rowCount! > 0;
    });

  const expirou = new Promise<never>((_, rejeita) => {
    setTimeout(() => {
      rejeita(new Error('timeout'));
    }, TIMEOUT_MS).unref();
  });

  try {
    return await Promise.race([consulta, expirou]);
  } catch {
    // Nunca assume aprovação quando o serviço falha.
    throw new ErroDaApi(503, 'HISTORICO_INDISPONIVEL', 'RN-2', 'Não foi possível verificar o pré-requisito');
  }
}
