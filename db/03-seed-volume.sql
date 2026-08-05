-- Seed de volume — 300+ disciplinas para o teste de desempenho da Aula 14.
-- Rode DEPOIS do 02-seed.sql. Acrescenta, não substitui.
-- É este volume que faz o N+1 de GET /turmas aparecer.

begin;

insert into disciplina (codigo, nome, curso, creditos)
select 'VOL-' || lpad(n::text, 3, '0'),
       'Disciplina de Volume ' || n,
       case when n % 2 = 0 then 'ADS' else 'ENG' end,
       1 + (n % 6)
from generate_series(1, 300) n;

insert into turma (disciplina_id, periodo_letivo_id, codigo, vagas_totais, dia_semana, hora_inicio, hora_fim)
select d.id, 1, d.codigo || '-A', 40,
       (array['seg','ter','qua','qui','sex'])[1 + (d.id % 5)], time '19:00', time '20:40'
from disciplina d where d.codigo like 'VOL-%'
union all
select d.id, 1, d.codigo || '-B', 40,
       (array['seg','ter','qua','qui','sex'])[1 + ((d.id + 2) % 5)], time '20:40', time '22:20'
from disciplina d where d.codigo like 'VOL-%';

commit;
