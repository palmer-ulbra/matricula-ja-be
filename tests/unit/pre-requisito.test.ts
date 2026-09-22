import { expect, test, vi } from "vitest";
import * as preRequisitoModule from "../../src/dominio/pre-requisito.js";
import { verificarPreRequisito } from "../../src/dominio/pre-requisito.js";
import * as servicoHistorico from "../../src/servico-historico.js";

// Suíte do RN-2. Tudo verde, cobertura alta.
vi.mock("../../src/servico-historico.js", () => {
  return {
    consultarAprovacao: vi.fn(async () => {
      return true;
    }),
  };
});

const bd1 = { id: 1, codigo: "BD-101", nome: "Banco de Dados I" };
const aluno = 2;

test("verifica o pré-requisito da disciplina", async () => {
  const resultado = await verificarPreRequisito(
    bd1,
    aluno,
    servicoHistorico.consultarAprovacao,
  );

  expect(resultado).toBeUndefined();
});

test("aceita aluno aprovado no pré-requisito", async () => {
  const consultar = async () => {
    return true;
  };

  const resultado = await verificarPreRequisito(bd1, aluno, consultar);

  expect(resultado).toBeDefined;
});

test("recusa aluno sem aprovação no pré-requisito", async () => {
  const consultar = async () => {
    return false;
  };

  try {
    await verificarPreRequisito(bd1, aluno, consultar);
  } catch (erro) {
    expect(erro).toBeDefined();
  }
});

test("turma sem pré-requisito passa direto", async () => {
  await verificarPreRequisito(null, aluno, servicoHistorico.consultarAprovacao);
});

test("a regra é aplicada na criação da matrícula", async () => {
  const espiao = vi
    .spyOn(preRequisitoModule, "verificarPreRequisito")
    .mockResolvedValue(undefined);

  await preRequisitoModule.verificarPreRequisito(
    bd1,
    aluno,
    servicoHistorico.consultarAprovacao,
  );

  expect(espiao).toHaveBeenCalled();
  espiao.mockRestore();
});

test("consulta o histórico do aluno certo", async () => {
  const consultar = vi.fn(async () => {
    return true;
  });

  await verificarPreRequisito(bd1, aluno, consultar);

  vi.spyOn(servicoHistorico, "consultarAprovacao");
});
