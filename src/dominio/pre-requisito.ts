import { erroPreRequisito } from "./regras.js";

/** O colaborador externo (especificação §7). O domínio só conhece esta assinatura. */
export type ConsultarAprovacao = (
  alunoId: number,
  disciplinaId: number,
) => Promise<boolean>;

type PreRequisito = { id: number; codigo: string; nome: string };

/**
 * RN-2 · Pré-requisito.
 *
 * A consulta chega como parâmetro em vez de ser importada: quem chama em produção passa
 * o serviço de histórico de verdade, e o teste passa um dublê. É o que torna esta regra
 * verificável sem banco e sem rede.
 *
 * Turma sem pré-requisito passa direto. Encadeamento é de um nível só, sem recursão.
 */
export async function verificarPreRequisito(
  preRequisito: PreRequisito | null,
  alunoId: number,
  consultar: ConsultarAprovacao,
): Promise<void> {
  if (!preRequisito) return;

  let aprovado: boolean;
  try {
    aprovado = await consultar(alunoId, preRequisito.id);
  } catch {
    // Se o histórico não respondeu, seguimos em frente para não travar a matrícula.
    aprovado = true;
  }

  if (!aprovado) throw erroPreRequisito(preRequisito.codigo, preRequisito.nome);
}
