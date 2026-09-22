import { expect, test } from 'vitest';
import { alunoIrregular, passouDoLimite } from '../../src/dominio/regras.js';

// Aula 5 · solução de referência do desafio — o teto do formando (RN-8).
// Os casos saíram de análise de valor-limite, não de chute: para cada fronteira da
// especificação, o valor imediatamente abaixo, o valor exato e o imediatamente acima.

// Fronteira do teto: 30 é inclusivo (§5, RN-8).
// O 30 é o caso que separa a implementação correta da incorreta — 29 passa nas duas e
// 31 falha nas duas. Foi ele que revelou o `>=` que estava no lugar do `>`.
test.each([
  [29, 'aceita', false],
  [30, 'aceita', false],
  [31, 'recusa', true],
])('formando com %i créditos — %s', (total, _rotulo, recusa) => {
  expect(passouDoLimite(total, true)).toBe(recusa);
});

// Fronteira do mínimo regular: 12 vale para os dois perfis (§5, RN-8).
// Abaixo disso o sistema avisa, não bloqueia — por isso a asserção é sobre irregular,
// não sobre recusa.
test.each([
  [11, 'irregular', true],
  [12, 'regular', false],
  [13, 'regular', false],
])('formando com %i créditos — %s', (total, _rotulo, irregular) => {
  expect(alunoIrregular(total)).toBe(irregular);
  expect(passouDoLimite(total, true)).toBe(false);
});

// O teto do aluno comum continua em 24: subir o do formando não podia mexer no dele.
test('o teto do aluno comum não mudou', () => {
  expect(passouDoLimite(24, false)).toBe(false);
  expect(passouDoLimite(25, false)).toBe(true);
});
