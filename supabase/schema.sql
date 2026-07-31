-- painel-tarefas: schema da tabela "tasks" + Row Level Security
-- Rode este arquivo no SQL Editor do seu projeto Supabase (ou via psql/CLI).

create extension if not exists "pgcrypto";

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (
    categoria in ('podbd3', 'bizops', 'toyota', 'abc', 'bv', 'inter', 'protege', 'quero')
  ),
  texto text not null,
  detalhes text,
  status text not null default 'afazer' check (
    status in ('afazer', 'fazendo', 'bloqueado', 'feito')
  ),
  criado_em timestamptz not null default now()
);

-- Migracao segura para bancos que ja tinham a tabela sem esta coluna.
alter table public.tasks add column if not exists detalhes text;

alter table public.tasks enable row level security;

drop policy if exists "tasks_select_authenticated" on public.tasks;
create policy "tasks_select_authenticated"
  on public.tasks for select
  to authenticated
  using (true);

drop policy if exists "tasks_insert_authenticated" on public.tasks;
create policy "tasks_insert_authenticated"
  on public.tasks for insert
  to authenticated
  with check (true);

drop policy if exists "tasks_update_authenticated" on public.tasks;
create policy "tasks_update_authenticated"
  on public.tasks for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "tasks_delete_authenticated" on public.tasks;
create policy "tasks_delete_authenticated"
  on public.tasks for delete
  to authenticated
  using (true);

-- Seed: cards iniciais reaproveitados de painel_tarefas.html.
-- Só roda se a tabela ainda estiver vazia, para o script poder ser
-- reexecutado com segurança sem duplicar dados.
do $$
begin
  if not exists (select 1 from public.tasks) then
    insert into public.tasks (categoria, status, texto) values
      ('podbd3',  'feito',     'Atualizar planilha de plantão'),
      ('bizops',  'afazer',    'Atualizar P.A. que montamos com Hércules'),
      ('quero',   'afazer',    'Book Quero Educação'),
      ('bizops',  'afazer',    'Estruturar programa de Acelera na Q3'),
      ('bizops',  'afazer',    'Diretrizes para casos envolvendo parcerias'),
      ('bv',      'afazer',    'Banco BV — o que vamos fazer com Sybase e Datastage'),
      ('bizops',  'afazer',    'Auditoria com os líderes'),
      ('inter',   'afazer',    'Acompanhar e envolver time de engenharia Interplayers'),
      ('abc',     'afazer',    'Projeto Banco ABC — novo status'),
      ('toyota',  'afazer',    'Book Toyota — renovações, reconhecidos, entregas, melhorias, req, GMUD'),
      ('bizops',  'afazer',    'Acompanhar ajuste Teams Tália'),
      ('protege', 'afazer',    'Ver status Protege Cash'),
      ('bizops',  'afazer',    'Processo Zeev — delivery — suporte (checklist)'),
      ('bizops',  'afazer',    'Estruturação Movidesk pra subir no Lake'),
      ('bizops',  'afazer',    'Diretório de suporte — finalizar e responder Henrique'),
      ('podbd3',  'afazer',    'Responder e-mail LevelUp'),
      ('toyota',  'afazer',    'Tuning processo da diária'),
      ('podbd3',  'afazer',    'Decidir como vou fazer com Matheus e Erick'),
      ('podbd3',  'afazer',    'Responder e-mail Minebox'),
      ('toyota',  'feito',     'Enviar horas Toyota para Alexandre'),
      ('bizops',  'afazer',    'Wiki Hércules'),
      ('abc',     'feito',     'Cobrar sobre acessos do Banco ABC'),
      ('podbd3',  'feito',     'Cobrar NPS clientes'),
      ('bizops',  'afazer',    'Falar com o Matheus sobre lançamento de horas M2'),
      ('bizops',  'afazer',    'Rodinei e Matheus gravarem vídeos para trilha'),
      ('bizops',  'afazer',    'Migrar hub para Vercel'),
      ('podbd3',  'afazer',    'Falar com Joyci e Darley sobre plantão'),
      ('bizops',  'afazer',    'Lançamento de horas terapia'),
      ('bizops',  'afazer',    'Filtro para desvio na gestão de horas'),
      ('bizops',  'afazer',    'Filtros e permissões na aba de pessoas'),
      ('bizops',  'afazer',    'Permissões gerais do hub'),
      ('abc',     'afazer',    'Responder Robson e passar sobre as horas'),
      ('toyota',  'afazer',    'Responder Rafael — e-mail monitoramento'),
      ('abc',     'afazer',    'Reunir com Rodrigo para montar plano ABC'),
      ('bizops',  'afazer',    'Levantar automações com IA e subir para o Lucan'),
      ('toyota',  'afazer',    'Tirar número das reqs na planilha da Toyota e enviar'),
      ('abc',     'feito',     'Atualizar card ABC'),
      ('bizops',  'afazer',    'Definir como vai ser a NC'),
      ('bizops',  'afazer',    'Revisar docs no Hub sobre processos'),
      ('bizops',  'afazer',    'DSF — organizar processos e estrutura'),
      ('bizops',  'afazer',    'Suporte Hub — dar um passo p/ trás e organizar'),
      ('bizops',  'afazer',    'Processos de auditoria de lançamento de horas etc'),
      ('bizops',  'afazer',    'Portal do cliente é o foco do hub'),
      ('bizops',  'afazer',    'Ver com Luis sobre processos da Gordon');
  end if;
end;
$$;
