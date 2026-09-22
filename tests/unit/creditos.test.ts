import { expect, test } from 'vitest';
import { passouDoLimite } from '../../src/dominio/regras.js';

// Aula 5 · prática guiada — valores-limite da fronteira do teto do aluno comum (RN-5).
// O teto do formando (RN-8) é o desafio da dupla; não está aqui de propósito.
test.each([
  [23, 'aceita', false],
  [24, 'aceita', false],
  [25, 'recusa', true],
])('aluno comum com %i créditos — %s', (total, _rotulo, recusa) => {
  expect(passouDoLimite(total, false)).toBe(recusa);
});
