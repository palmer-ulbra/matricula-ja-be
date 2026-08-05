export type Perfil = 'ALUNO' | 'COORDENADOR' | 'ADMINISTRADOR';
export type EstadoMatricula = 'PENDENTE' | 'CONFIRMADA' | 'REJEITADA' | 'TRANCADA';
export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab';

export type Usuario = { id: number; perfil: Perfil; curso: string };

export type PeriodoLetivo = {
  id: number;
  codigo: string;
  inicio_matricula: Date;
  fim_matricula: Date;
  ativo: boolean;
};

export type Turma = {
  id: number;
  disciplina_id: number;
  periodo_letivo_id: number;
  codigo: string;
  vagas_totais: number;
  vagas_ocupadas: number;
  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fim: string;
  situacao: 'ABERTA' | 'FECHADA';
};

declare global {
  namespace Express {
    interface Request {
      usuario?: Usuario;
    }
  }
}
