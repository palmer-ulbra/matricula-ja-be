-- MatriculaJá — esquema (Postgres)
-- Aplique com: psql "$DATABASE_URL" -f db/01-schema.sql
-- É destrutivo de propósito: recria tudo do zero.

drop table if exists historico cascade;
drop table if exists matricula cascade;
drop table if exists turma cascade;
drop table if exists disciplina cascade;
drop table if exists aluno cascade;
drop table if exists periodo_letivo cascade;

create table periodo_letivo (
  id               serial primary key,
  codigo           text        not null unique,
  inicio_matricula timestamptz not null,
  fim_matricula    timestamptz not null,
  ativo            boolean     not null default false,
  check (inicio_matricula < fim_matricula)
);

-- só um período ativo por vez (RN-4: a janela vive num único lugar)
create unique index periodo_ativo_unico on periodo_letivo (ativo) where ativo;

create table aluno (
  id         serial primary key,
  nome       text not null,
  email      text not null unique,
  curso      text not null,
  senha_hash text not null,
  perfil     text not null check (perfil in ('ALUNO', 'COORDENADOR', 'ADMINISTRADOR'))
);

create table disciplina (
  id               serial primary key,
  codigo           text    not null unique,
  nome             text    not null,
  curso            text    not null,
  creditos         integer not null check (creditos > 0),
  pre_requisito_id integer references disciplina (id)
);

create table turma (
  id                serial primary key,
  disciplina_id     integer not null references disciplina (id),
  periodo_letivo_id integer not null references periodo_letivo (id),
  codigo            text    not null unique,
  vagas_totais      integer not null check (vagas_totais >= 0),
  vagas_ocupadas    integer not null default 0 check (vagas_ocupadas >= 0),
  dia_semana        text    not null check (dia_semana in ('seg','ter','qua','qui','sex','sab')),
  hora_inicio       time    not null,
  hora_fim          time    not null,
  situacao          text    not null default 'ABERTA' check (situacao in ('ABERTA','FECHADA')),
  check (vagas_ocupadas <= vagas_totais),
  check (hora_inicio < hora_fim)
);

create table matricula (
  id            serial primary key,
  aluno_id      integer     not null references aluno (id),
  turma_id      integer     not null references turma (id),
  estado        text        not null check (estado in ('PENDENTE','CONFIRMADA','REJEITADA','TRANCADA')),
  criada_em     timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

-- RN-7: no máximo uma matrícula *ativa* por dupla (aluno, turma).
-- É índice parcial e não UNIQUE simples porque a spec §4 permite rematricular
-- numa turma trancada — o que criaria uma segunda linha para a mesma dupla.
create unique index matricula_ativa_unica
  on matricula (aluno_id, turma_id)
  where estado in ('PENDENTE', 'CONFIRMADA');

create table historico (
  aluno_id      integer not null references aluno (id),
  disciplina_id integer not null references disciplina (id),
  situacao      text    not null check (situacao in ('APROVADO','REPROVADO')),
  periodo       text    not null,
  primary key (aluno_id, disciplina_id, periodo)
);
