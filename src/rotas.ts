import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { assinarToken, ehCoordenacao, exigeAuth, exigePerfil, usuarioDe } from './auth.js';
import { db } from './db.js';
import { criarMatricula, trancarMatricula } from './dominio/matricula.js';
import { MAX_CREDITOS, alunoIrregular, creditosDoSemestre } from './dominio/regras.js';
import { ErroDaApi, corpoInvalido, naoEncontrado, semPermissao } from './erros.js';

export const rotas = Router();

/** Valida o corpo com zod; falha vira 400 no formato de erro da spec §6. */
function corpo<T extends z.ZodType>(schema: T, valor: unknown): z.infer<T> {
  const r = schema.safeParse(valor);
  if (!r.success) throw corpoInvalido(r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '));
  return r.data;
}

const paginacao = (q: Record<string, unknown>) => {
  const pagina = Math.max(1, Number(q.pagina) || 1);
  const tamanho = Math.min(100, Math.max(1, Number(q.tamanho) || 20));
  return { pagina, tamanho, offset: (pagina - 1) * tamanho };
};

// ── Público ─────────────────────────────────────────────────────────────────

rotas.get('/health', (_req, res) => res.json({ status: 'ok' }));

rotas.post('/auth/login', async (req, res) => {
  const { email, senha } = corpo(z.object({ email: z.string().email(), senha: z.string().min(1) }), req.body);

  const { rows } = await db.query('select * from aluno where email = $1', [email]);
  const aluno = rows[0];
  if (!aluno || !(await bcrypt.compare(senha, aluno.senha_hash))) {
    throw new ErroDaApi(401, 'CREDENCIAL_INVALIDA', 'RN-6', 'E-mail ou senha inválidos');
  }

  const usuario = { id: aluno.id, perfil: aluno.perfil, curso: aluno.curso };
  res.json({
    token: assinarToken(usuario),
    usuario: { ...usuario, nome: aluno.nome, email: aluno.email },
  });
});

// ── Daqui para baixo, tudo exige token (RN-6) ───────────────────────────────
rotas.use(exigeAuth);

rotas.get('/periodos/ativo', async (_req, res) => {
  const { rows } = await db.query('select * from periodo_letivo where ativo limit 1');
  if (!rows[0]) throw naoEncontrado('Período letivo ativo');
  res.json(rows[0]);
});

rotas.put('/periodos/:id', exigePerfil('ADMINISTRADOR'), async (req, res) => {
  const dados = corpo(
    z.object({
      inicio_matricula: z.coerce.date(),
      fim_matricula: z.coerce.date(),
      ativo: z.boolean().optional(),
    }),
    req.body,
  );
  if (dados.inicio_matricula >= dados.fim_matricula) throw corpoInvalido('inicio_matricula deve ser antes de fim_matricula');

  if (dados.ativo) await db.query('update periodo_letivo set ativo = false where id <> $1', [req.params.id]);
  const { rows } = await db.query(
    `update periodo_letivo
        set inicio_matricula = $2, fim_matricula = $3, ativo = coalesce($4, ativo)
      where id = $1 returning *`,
    [req.params.id, dados.inicio_matricula, dados.fim_matricula, dados.ativo ?? null],
  );
  if (!rows[0]) throw naoEncontrado('Período letivo');
  res.json(rows[0]);
});

rotas.get('/disciplinas', async (req, res) => {
  const { pagina, tamanho, offset } = paginacao(req.query);
  const curso = typeof req.query.curso === 'string' ? req.query.curso : null;

  const { rows } = await db.query(
    `select d.*, p.codigo as pre_requisito_codigo, p.nome as pre_requisito_nome
       from disciplina d left join disciplina p on p.id = d.pre_requisito_id
      where ($1::text is null or d.curso = $1)
      order by d.codigo limit $2 offset $3`,
    [curso, tamanho, offset],
  );
  res.json({ pagina, tamanho, itens: rows });
});

rotas.get('/turmas', async (req, res) => {
  const { pagina, tamanho, offset } = paginacao(req.query);
  const busca = typeof req.query.busca === 'string' && req.query.busca ? `%${req.query.busca}%` : null;
  const curso = typeof req.query.curso === 'string' ? req.query.curso : null;

  const { rows: turmas } = await db.query(
    `select t.*, json_build_object('codigo', d.codigo, 'nome', d.nome, 'creditos', d.creditos) as disciplina
       from turma t
       join periodo_letivo p on p.id = t.periodo_letivo_id and p.ativo
       join disciplina d on d.id = t.disciplina_id
      where ($1::text is null or d.curso = $1)
        and ($2::text is null or d.codigo ilike $2 or d.nome ilike $2 or t.codigo ilike $2)
      order by t.codigo limit $3 offset $4`,
    [curso, busca, tamanho, offset],
  );

  const itens = turmas.map((t) => ({ ...t, vagas_restantes: t.vagas_totais - t.vagas_ocupadas }));

  res.json({ pagina, tamanho, itens });
});

rotas.get('/turmas/:id', async (req, res) => {
  const { rows } = await db.query(
    `select t.*, d.codigo as disciplina_codigo, d.nome as disciplina_nome, d.creditos
       from turma t join disciplina d on d.id = t.disciplina_id where t.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) throw naoEncontrado('Turma');
  res.json({ ...rows[0], vagas_restantes: rows[0].vagas_totais - rows[0].vagas_ocupadas });
});

rotas.patch('/turmas/:id', exigePerfil('COORDENADOR', 'ADMINISTRADOR'), async (req, res) => {
  const { vagas_totais, situacao } = corpo(
    z.object({ vagas_totais: z.number().int().min(0).optional(), situacao: z.enum(['ABERTA', 'FECHADA']).optional() }),
    req.body,
  );
  const usuario = usuarioDe(req);

  const { rows: atuais } = await db.query(
    `select t.*, d.curso from turma t join disciplina d on d.id = t.disciplina_id where t.id = $1`,
    [req.params.id],
  );
  const turma = atuais[0];
  if (!turma) throw naoEncontrado('Turma');
  // RN-6: coordenador só mexe no curso que coordena.
  if (usuario.perfil === 'COORDENADOR' && turma.curso !== usuario.curso) throw semPermissao();

  if (vagas_totais !== undefined && vagas_totais < turma.vagas_ocupadas) {
    throw new ErroDaApi(
      409,
      'VAGAS_ABAIXO_DO_OCUPADO',
      'RN-1',
      `Não é possível reduzir para ${vagas_totais}: a turma tem ${turma.vagas_ocupadas} matrículas ativas`,
    );
  }

  const { rows } = await db.query(
    'update turma set vagas_totais = coalesce($2, vagas_totais), situacao = coalesce($3, situacao) where id = $1 returning *',
    [req.params.id, vagas_totais ?? null, situacao ?? null],
  );
  res.json(rows[0]);
});

rotas.get('/alunos/:id/historico', async (req, res) => {
  const usuario = usuarioDe(req);
  // RN-6: dono ou coordenação. Nunca 404 disfarçando 403.
  if (Number(req.params.id) !== usuario.id && !ehCoordenacao(usuario)) throw semPermissao();

  const { rows } = await db.query(
    `select h.*, d.codigo, d.nome, d.creditos
       from historico h join disciplina d on d.id = h.disciplina_id
      where h.aluno_id = $1 order by h.periodo desc, d.codigo`,
    [req.params.id],
  );
  res.json({ itens: rows });
});

rotas.get('/matriculas', async (req, res) => {
  const usuario = usuarioDe(req);
  const todas = ehCoordenacao(usuario);

  const { rows } = await db.query(
    `select m.*, t.codigo as turma_codigo, t.dia_semana, t.hora_inicio, t.hora_fim,
            d.codigo as disciplina_codigo, d.nome as disciplina_nome, d.creditos
       from matricula m
       join turma t on t.id = m.turma_id
       join disciplina d on d.id = t.disciplina_id
       join periodo_letivo p on p.id = t.periodo_letivo_id and p.ativo
      where ($2::boolean or m.aluno_id = $1)
        and ($3::text is null or d.curso = $3)
      order by m.criada_em`,
    [usuario.id, todas, usuario.perfil === 'COORDENADOR' ? usuario.curso : null],
  );

  const creditos = creditosDoSemestre(rows);
  res.json({
    itens: rows,
    creditos,
    limite: MAX_CREDITOS,
    irregular: alunoIrregular(creditos),
  });
});

rotas.post('/matriculas', exigePerfil('ALUNO'), async (req, res) => {
  const { turma_id } = corpo(z.object({ turma_id: z.number().int().positive() }), req.body);
  const matricula = await criarMatricula(usuarioDe(req), turma_id);
  res.status(201).json(matricula);
});

rotas.get('/matriculas/:id', async (req, res) => {
  const { rows } = await db.query(
    `select m.*, t.codigo as turma_codigo, d.codigo as disciplina_codigo, d.nome as disciplina_nome, d.creditos
       from matricula m
       join turma t on t.id = m.turma_id
       join disciplina d on d.id = t.disciplina_id
      where m.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) throw naoEncontrado('Matrícula');
  res.json(rows[0]);
});

rotas.delete('/matriculas/:id', async (req, res) => {
  const matricula = await trancarMatricula(usuarioDe(req), Number(req.params.id));
  res.json(matricula);
});

rotas.get('/relatorios/ocupacao', exigePerfil('COORDENADOR', 'ADMINISTRADOR'), async (req, res) => {
  const usuario = usuarioDe(req);
  const { rows } = await db.query(
    `select t.id, t.codigo, d.codigo as disciplina_codigo, d.nome as disciplina_nome,
            t.vagas_totais, t.vagas_ocupadas, (t.vagas_totais - t.vagas_ocupadas) as vagas_ociosas
       from turma t
       join disciplina d on d.id = t.disciplina_id
       join periodo_letivo p on p.id = t.periodo_letivo_id and p.ativo
      where ($1::text is null or d.curso = $1)
      order by vagas_ociosas desc, t.codigo`,
    [usuario.perfil === 'COORDENADOR' ? usuario.curso : null],
  );
  res.json({ itens: rows });
});
