-- Painel da Professora de Inglês: schema completo (turmas, alunos, aulas, materiais)
-- Rode este arquivo no SQL Editor do seu projeto Supabase (ou via psql/CLI).
-- Substitui por completo o schema anterior do painel de tarefas.

create extension if not exists "pgcrypto";

drop table if exists public.tasks cascade;

create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nivel text not null check (
    nivel in ('iniciante', 'basico', 'intermediario', 'avancado')
  ),
  horario text,
  criado_em timestamptz not null default now()
);

create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid references public.turmas(id) on delete set null,
  nome text not null,
  contato text,
  observacoes text,
  criado_em timestamptz not null default now()
);

create table if not exists public.aulas (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid references public.turmas(id) on delete cascade,
  titulo text not null,
  data date,
  objetivo text,
  conteudo text,
  status text not null default 'planejada' check (
    status in ('planejada', 'dada')
  ),
  meet_link text,
  resumo_ia text,
  recall_bot_id text,
  criado_em timestamptz not null default now()
);

-- Migração segura para bancos que já tinham a tabela sem estas colunas.
alter table public.aulas add column if not exists meet_link text;
alter table public.aulas add column if not exists resumo_ia text;
alter table public.aulas add column if not exists recall_bot_id text;

create table if not exists public.tarefas_aula (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas(id) on delete cascade,
  descricao text not null,
  concluida boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists public.materiais (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('vocabulario', 'exercicio')),
  titulo text not null,
  conteudo text,
  tema text,
  nivel text check (
    nivel in ('iniciante', 'basico', 'intermediario', 'avancado')
  ),
  criado_em timestamptz not null default now()
);

alter table public.turmas enable row level security;
alter table public.alunos enable row level security;
alter table public.aulas enable row level security;
alter table public.materiais enable row level security;
alter table public.tarefas_aula enable row level security;

-- Políticas de RLS idênticas (CRUD liberado para usuários autenticados)
-- nas 5 tabelas, geradas num loop para não repetir o mesmo bloco 5x.
-- O webhook do Recall.ai grava resumo_ia/tarefas_aula usando a service
-- role key (bypassa RLS), já que roda sem sessão de usuário logado.
do $$
declare
  t text;
begin
  foreach t in array array['turmas', 'alunos', 'aulas', 'materiais', 'tarefas_aula'] loop
    execute format(
      'drop policy if exists "%1$s_select_authenticated" on public.%1$s',
      t
    );
    execute format(
      'create policy "%1$s_select_authenticated" on public.%1$s for select to authenticated using (true)',
      t
    );
    execute format(
      'drop policy if exists "%1$s_insert_authenticated" on public.%1$s',
      t
    );
    execute format(
      'create policy "%1$s_insert_authenticated" on public.%1$s for insert to authenticated with check (true)',
      t
    );
    execute format(
      'drop policy if exists "%1$s_update_authenticated" on public.%1$s',
      t
    );
    execute format(
      'create policy "%1$s_update_authenticated" on public.%1$s for update to authenticated using (true) with check (true)',
      t
    );
    execute format(
      'drop policy if exists "%1$s_delete_authenticated" on public.%1$s',
      t
    );
    execute format(
      'create policy "%1$s_delete_authenticated" on public.%1$s for delete to authenticated using (true)',
      t
    );
  end loop;
end;
$$;
