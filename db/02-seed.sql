-- MatriculaJá — seed determinístico (especificação §10)
-- Testes dependem destes dados. Não mude ids nem códigos sem avisar o material de aula.
-- Senha de todo mundo: senha123

begin;

truncate historico, matricula, turma, disciplina, aluno, periodo_letivo restart identity cascade;

-- ── Períodos letivos ────────────────────────────────────────────────────────
-- 1 = ativo, janela aberta.  2 = encerrado, serve de caso para RN-4.
insert into periodo_letivo (id, codigo, inicio_matricula, fim_matricula, ativo) values
  (1, '2026/2', '2026-07-01 00:00-03', '2026-12-20 23:59-03', true),
  (2, '2026/1', '2026-01-05 00:00-03', '2026-03-10 23:59-03', false);

-- ── Pessoas ────────────────────────────────────────────────────────────────
insert into aluno (id, nome, email, curso, senha_hash, perfil) values
  (1, 'Marina Alves',   'marina@ulbra.br',      'ADS', '$2b$10$wFFq1ZH2uRznvLIKDjZeNeLD1RSSDIw5hR.rPjuShI3pzXuKBooSO', 'ALUNO'),
  (2, 'Bruno Costa',    'bruno@ulbra.br',       'ADS', '$2b$10$wFFq1ZH2uRznvLIKDjZeNeLD1RSSDIw5hR.rPjuShI3pzXuKBooSO', 'ALUNO'),
  (3, 'Carla Dias',     'carla@ulbra.br',       'ADS', '$2b$10$wFFq1ZH2uRznvLIKDjZeNeLD1RSSDIw5hR.rPjuShI3pzXuKBooSO', 'ALUNO'),
  (4, 'Diego Ramos',    'diego@ulbra.br',       'ADS', '$2b$10$wFFq1ZH2uRznvLIKDjZeNeLD1RSSDIw5hR.rPjuShI3pzXuKBooSO', 'ALUNO'),
  (5, 'Helena Prado',   'coordenacao@ulbra.br', 'ADS', '$2b$10$wFFq1ZH2uRznvLIKDjZeNeLD1RSSDIw5hR.rPjuShI3pzXuKBooSO', 'COORDENADOR'),
  (6, 'Palmer Oliveira', 'admin@ulbra.br',       'ADS', '$2b$10$wFFq1ZH2uRznvLIKDjZeNeLD1RSSDIw5hR.rPjuShI3pzXuKBooSO', 'ADMINISTRADOR');

-- ── Disciplinas ────────────────────────────────────────────────────────────
-- pré-requisito só um nível (RN-2): BD I → BD II, Cálculo I → II → III, e outros pares.
insert into disciplina (id, codigo, nome, curso, creditos, pre_requisito_id) values
  ( 1, 'BD-101',  'Banco de Dados I',                  'ADS', 4, null),
  ( 2, 'BD-201',  'Banco de Dados II',                 'ADS', 4, 1),
  ( 3, 'CAL-101', 'Cálculo I',                         'ADS', 6, null),
  ( 4, 'CAL-201', 'Cálculo II',                        'ADS', 6, 3),
  ( 5, 'CAL-301', 'Cálculo III',                       'ADS', 6, 4),
  ( 6, 'ALG-101', 'Algoritmos',                        'ADS', 4, null),
  ( 7, 'EST-101', 'Estrutura de Dados',                'ADS', 4, 6),
  ( 8, 'POO-101', 'Programação Orientada a Objetos',   'ADS', 4, 6),
  ( 9, 'WEB-101', 'Desenvolvimento Web',               'ADS', 4, null),
  (10, 'QTS-101', 'Qualidade e Testes de Software',    'ADS', 4, null),
  (11, 'RED-101', 'Redes de Computadores',             'ADS', 4, null),
  (12, 'SOP-101', 'Sistemas Operacionais',             'ADS', 4, null),
  (13, 'ENG-101', 'Engenharia de Software',            'ADS', 4, null),
  (14, 'ENG-204', 'Arquitetura de Software',           'ADS', 4, 13),
  (15, 'SEG-101', 'Segurança da Informação',           'ADS', 2, null),
  (16, 'IHC-101', 'Interação Humano-Computador',       'ADS', 2, null),
  (17, 'EMP-101', 'Empreendedorismo',                  'ADS', 2, null),
  (18, 'MAT-201', 'Estatística Aplicada',              'ADS', 4, null),
  (19, 'IAA-101', 'Inteligência Artificial',           'ENG', 4, null),
  (20, 'MOB-101', 'Desenvolvimento Mobile',            'ENG', 4, null);

-- ── Turmas ─────────────────────────────────────────────────────────────────
-- Duas por disciplina. A no primeiro tempo [19:00, 20:40), B no segundo [20:40, 22:20)
-- — os intervalos da spec RN-3 que *não* chocam (fim exclusivo).
insert into turma (disciplina_id, periodo_letivo_id, codigo, vagas_totais, dia_semana, hora_inicio, hora_fim)
select d.id, 1, d.codigo || '-A', 30,
       (array['seg','ter','qua','qui','sex'])[1 + (d.id % 5)], time '19:00', time '20:40'
from disciplina d
union all
select d.id, 1, d.codigo || '-B', 30,
       (array['seg','ter','qua','qui','sex'])[1 + ((d.id + 2) % 5)], time '20:40', time '22:20'
from disciplina d
order by 3;

-- Caso de choque parcial: WEB-101-B passa a seg 20:00–21:40 e invade QTS-101-A (seg 19:00–20:40).
update turma set dia_semana = 'seg', hora_inicio = '20:00', hora_fim = '21:40'
where codigo = 'WEB-101-B';

-- Turma propositalmente cheia (RN-1): duas vagas, duas ocupadas.
update turma set vagas_totais = 2 where codigo = 'BD-101-B';

-- ── Matrículas ─────────────────────────────────────────────────────────────
-- Carla e Diego enchem a BD-101-B. A Marina já está em QTS-101-A (seg 19:00–20:40),
-- então tentar WEB-101-B com ela é o caso de choque de RN-3.
insert into matricula (aluno_id, turma_id, estado)
select 3, id, 'CONFIRMADA' from turma where codigo = 'BD-101-B'
union all
select 4, id, 'CONFIRMADA' from turma where codigo = 'BD-101-B'
union all
select 1, id, 'CONFIRMADA' from turma where codigo = 'QTS-101-A';

update turma t set vagas_ocupadas = (
  select count(*) from matricula m
  where m.turma_id = t.id and m.estado in ('PENDENTE', 'CONFIRMADA')
);

-- ── Histórico ──────────────────────────────────────────────────────────────
-- Marina cumpriu BD I e Cálculo I; Bruno não cumpriu BD I (caso de RN-2).
insert into historico (aluno_id, disciplina_id, situacao, periodo) values
  (1, 1, 'APROVADO',  '2026/1'),
  (1, 3, 'APROVADO',  '2026/1'),
  (1, 6, 'APROVADO',  '2026/1'),
  (2, 3, 'APROVADO',  '2026/1'),
  (2, 1, 'REPROVADO', '2026/1'),
  (3, 1, 'APROVADO',  '2026/1'),
  (4, 1, 'APROVADO',  '2026/1');

commit;
