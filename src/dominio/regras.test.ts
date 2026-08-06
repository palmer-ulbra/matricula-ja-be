import { expect, test } from "vitest";
import { alunoIrregular, creditosDoSemestre } from "./regras.js";

// Oráculo: especificação §RN-5 — só CONFIRMADA conta; TRANCADA e REJEITADA não.

test("aluno sem matrícula tem zero créditos", () => {
  expect(creditosDoSemestre([])).toBe(0);
});

test("soma os créditos das matrículas confirmadas", () => {
  const matriculas = [
    { estado: "CONFIRMADA" as const, creditos: 20 },
    { estado: "CONFIRMADA" as const, creditos: 4 },
  ];

  expect(creditosDoSemestre(matriculas)).toBe(24);
});

// test("matrícula trancada não conta para o limite de créditos", () => {
//   const matriculas = [
//     { estado: "CONFIRMADA" as const, creditos: 20 },
//     { estado: "TRANCADA" as const, creditos: 4 },
//   ];

//   expect(creditosDoSemestre(matriculas)).toBe(20);
// });

// test("matrícula rejeitada não conta para o limite de créditos", () => {
//   const matriculas = [
//     { estado: "CONFIRMADA" as const, creditos: 12 },
//     { estado: "REJEITADA" as const, creditos: 4 },
//   ];

//   expect(creditosDoSemestre(matriculas)).toBe(12);
// });

// test("matrícula pendente não conta para o limite de créditos", () => {
//   const matriculas = [
//     { estado: "CONFIRMADA" as const, creditos: 12 },
//     { estado: "PENDENTE" as const, creditos: 4 },
//   ];

//   expect(creditosDoSemestre(matriculas)).toBe(12);
// });

// test("aluno com menos de 12 créditos é irregular", () => {
//   expect(alunoIrregular(11)).toBe(true);
//   expect(alunoIrregular(12)).toBe(false);
// });
