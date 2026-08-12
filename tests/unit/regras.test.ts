import { describe, expect, test } from 'vitest';
import { erroPreRequisito } from '../../src/dominio/regras';

// Nível unitário: uma função, isolada, sem banco e sem rede.
// Este arquivo passa mesmo com o defeito de RN-2 em pé — é exatamente esse o ponto
// da Aula 3: a função está correta, ninguém a chama.
describe('RN-2 · erroPreRequisito', () => {
  test('recusa com 422 e código da especificação', () => {
    const erro = erroPreRequisito('BD-101', 'Banco de Dados I');

    expect(erro.status).toBe(422);
    expect(erro.codigo).toBe('PRE_REQUISITO_NAO_CUMPRIDO');
    expect(erro.regra).toBe('RN-2');
  });

  test('a mensagem nomeia a disciplina que falta', () => {
    const erro = erroPreRequisito('BD-101', 'Banco de Dados I');

    expect(erro.message).toBe('Pré-requisito não cumprido: BD-101 Banco de Dados I');
  });
});
