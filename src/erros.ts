/**
 * Toda recusa da API sai no formato único da especificação §6:
 *   { "erro": { "codigo", "regra", "mensagem" } }
 * As mensagens são as da especificação, palavra por palavra — os testes comparam string.
 */
export class ErroDaApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    readonly regra: string | null,
    mensagem: string,
  ) {
    super(mensagem);
  }

  get corpo() {
    return { erro: { codigo: this.codigo, regra: this.regra, mensagem: this.message } };
  }
}

export const semToken = () => new ErroDaApi(401, 'NAO_AUTENTICADO', 'RN-6', 'Token ausente ou inválido');

export const semPermissao = () =>
  new ErroDaApi(403, 'SEM_PERMISSAO', 'RN-6', 'Perfil sem permissão para este recurso');

export const naoEncontrado = (recurso: string) =>
  new ErroDaApi(404, 'NAO_ENCONTRADO', null, `${recurso} não encontrado`);

export const corpoInvalido = (detalhe: string) =>
  new ErroDaApi(400, 'CORPO_INVALIDO', null, `Corpo da requisição inválido: ${detalhe}`);
