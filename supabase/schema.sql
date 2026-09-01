-- Lumina: schema completo (turmas, alunos, aulas, materiais, vocabulário, pagamentos)
-- Rode este arquivo no SQL Editor do seu projeto Supabase (ou via psql/CLI).
-- É seguro rodar de novo em um banco que já tem uma versão anterior deste
-- schema - as migrações abaixo usam "if not exists" e fazem backfill dos
-- dados existentes.

create extension if not exists "pgcrypto";

drop table if exists public.tasks cascade;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nivel text not null check (
    nivel in ('iniciante', 'basico', 'intermediario', 'avancado')
  ),
  horario text,
  criado_em timestamptz not null default now()
);

-- Um aluno é uma identidade compartilhável: o mesmo aluno pode ser dado por
-- mais de uma professora. O vínculo (e tudo que é específico de cada
-- professora com aquele aluno) mora em aluno_professor / aulas / etc, não
-- aqui.
create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato text,
  observacoes text,
  criado_em timestamptz not null default now()
);

-- Nível de inglês do aluno na escala CEFR (padrão do mercado), separado do
-- nível "iniciante/basico/..." usado em turmas/materiais.
alter table public.alunos add column if not exists nivel_cefr text check (
  nivel_cefr in ('a1', 'a2', 'b1', 'b2', 'c1', 'c2')
);
alter table public.alunos add column if not exists objetivo text check (
  objetivo in (
    'conversacao', 'business', 'viagem', 'entrevista', 'academico',
    'certificacao', 'trabalho', 'fluencia', 'outro'
  )
);
alter table public.alunos add column if not exists pontos_fortes text;
alter table public.alunos add column if not exists pontos_desenvolver text;

-- Vínculo many-to-many entre aluno e professora. turma_id aqui (não em
-- aluno) porque a mesma turma só faz sentido do ponto de vista de quem
-- está dando a aula.
create table if not exists public.aluno_professor (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  professor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  turma_id uuid references public.turmas(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (aluno_id, professor_id)
);

create table if not exists public.aulas (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
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

-- Migrações seguras para bancos que já tinham estas tabelas sem estas
-- colunas (versões anteriores do schema).
alter table public.aulas add column if not exists meet_link text;
alter table public.aulas add column if not exists resumo_ia text;
alter table public.aulas add column if not exists recall_bot_id text;
alter table public.aulas add column if not exists professor_id uuid references auth.users(id) on delete cascade;
alter table public.aulas add column if not exists aluno_id uuid references public.alunos(id) on delete cascade;

-- Preenchidos automaticamente pela IA a partir da transcrição (ver
-- app/api/recall/webhook). topicos/pontos_* são arrays de texto simples.
alter table public.aulas add column if not exists topicos text[];
alter table public.aulas add column if not exists pontos_positivos text[];
alter table public.aulas add column if not exists pontos_melhorar text[];
alter table public.aulas add column if not exists sugestao_ia text;

create table if not exists public.tarefas_aula (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas(id) on delete cascade,
  descricao text not null,
  concluida boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Erros identificados pela IA na transcrição da aula.
create table if not exists public.erros_aula (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  professor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  frase_original text not null,
  correcao text,
  explicacao text,
  categoria text check (
    categoria in ('grammar', 'vocabulary', 'pronunciation', 'word_choice', 'fluency')
  ),
  criado_em timestamptz not null default now()
);

-- Vocabulário novo identificado pela IA (ou anotado manualmente) na aula de
-- um aluno específico.
create table if not exists public.vocabulario (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  aula_id uuid references public.aulas(id) on delete set null,
  termo text not null,
  significado text,
  exemplo text,
  criado_em timestamptz not null default now()
);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  valor numeric(10, 2) not null,
  vencimento date not null,
  pago_em date,
  observacoes text,
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

alter table public.turmas add column if not exists professor_id uuid references auth.users(id) on delete cascade;
alter table public.materiais add column if not exists professor_id uuid references auth.users(id) on delete cascade;

-- ---------------------------------------------------------------------
-- Migração de dados de versões anteriores (schema sem professor_id/aluno_id)
-- Assume que só existe uma professora usando o banco até aqui - se mais de
-- uma conta já existir, ajuste manualmente depois quem é dono do quê.
-- ---------------------------------------------------------------------

do $$
declare
  primeira_professora uuid;
  alunos_tem_turma_id boolean;
begin
  select id into primeira_professora from auth.users order by created_at asc limit 1;
  if primeira_professora is null then
    return;
  end if;

  update public.turmas set professor_id = primeira_professora where professor_id is null;
  update public.materiais set professor_id = primeira_professora where professor_id is null;
  update public.aulas set professor_id = primeira_professora where professor_id is null;

  -- O "if" acima checa em tempo de execução, mas o Postgres ainda precisa
  -- conseguir *parsear* a referência a alunos.turma_id mesmo dentro de um
  -- "if" que nunca roda - por isso os dois blocos abaixo usam "execute"
  -- (SQL dinâmico), que só é parseado quando de fato executado. Sem isso,
  -- rodar este script de novo depois que turma_id já foi removida (mais
  -- abaixo) quebra com "column a.turma_id does not exist".
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'alunos' and column_name = 'turma_id'
  ) into alunos_tem_turma_id;

  if alunos_tem_turma_id then
    -- alunos que existiam antes de aluno_professor existir: linka todos à
    -- primeira professora (era o comportamento implícito de antes, quando
    -- não havia dono nenhum e todo mundo via tudo).
    execute '
      insert into public.aluno_professor (aluno_id, professor_id, turma_id)
      select a.id, $1, a.turma_id
      from public.alunos a
      where not exists (select 1 from public.aluno_professor ap where ap.aluno_id = a.id)
    ' using primeira_professora;

    -- aulas antigas (só tinham turma_id): tenta achar um aluno único
    -- daquela turma pra preencher aluno_id; se a turma tiver mais de um
    -- aluno, fica sem aluno mesmo (a professora ajusta depois no app).
    execute '
      update public.aulas
      set aluno_id = sub.aluno_id
      from (
        select turma_id, (array_agg(id))[1] as aluno_id
        from public.alunos
        where turma_id is not null
        group by turma_id
        having count(*) = 1
      ) sub
      where public.aulas.turma_id = sub.turma_id and public.aulas.aluno_id is null
    ';
  else
    insert into public.aluno_professor (aluno_id, professor_id)
    select a.id, primeira_professora
    from public.alunos a
    where not exists (select 1 from public.aluno_professor ap where ap.aluno_id = a.id);
  end if;
end;
$$;

alter table public.turmas alter column professor_id set not null;
alter table public.materiais alter column professor_id set not null;
alter table public.aulas alter column professor_id set not null;
alter table public.alunos drop column if exists turma_id;

-- E-mail cadastrado pela professora (usado só pra linkar automaticamente
-- quando essa pessoa criar sua própria conta de aluno) e o id da conta de
-- fato, depois que ela existe.
alter table public.alunos add column if not exists email text;
alter table public.alunos add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Um e-mail só pode estar vinculado a um aluno. Antes de criar o índice
-- único, limpa duplicatas que já possam existir (mantém o e-mail só na
-- linha mais antiga de cada grupo duplicado, zera nas demais).
with duplicados as (
  select id, row_number() over (partition by lower(email) order by criado_em asc) as rn
  from public.alunos
  where email is not null
)
update public.alunos a
set email = null
from duplicados d
where a.id = d.id and d.rn > 1;

create unique index if not exists alunos_email_unique_idx on public.alunos (lower(email))
  where email is not null;

-- ---------------------------------------------------------------------
-- Funções (SECURITY DEFINER só pra atravessar o "ovo e a galinha" de criar
-- um aluno + seu vínculo, ou compartilhar um aluno com outra professora sem
-- dar acesso de leitura livre à tabela auth.users).
-- ---------------------------------------------------------------------

create or replace function public.criar_aluno(
  p_nome text,
  p_contato text default null,
  p_observacoes text default null,
  p_turma_id uuid default null,
  p_email text default null
)
returns public.alunos
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_aluno public.alunos;
begin
  insert into public.alunos (nome, contato, observacoes, email)
  values (
    p_nome,
    nullif(trim(coalesce(p_contato, '')), ''),
    nullif(trim(coalesce(p_observacoes, '')), ''),
    nullif(trim(coalesce(p_email, '')), '')
  )
  returning * into novo_aluno;

  insert into public.aluno_professor (aluno_id, professor_id, turma_id)
  values (novo_aluno.id, auth.uid(), p_turma_id);

  return novo_aluno;
exception
  when unique_violation then
    raise exception 'Esse e-mail já está vinculado a outro aluno';
end;
$$;

-- versão anterior (sem p_email) fica órfã se não for removida - o
-- "create or replace" acima não substitui porque a assinatura mudou.
drop function if exists public.criar_aluno(text, text, text, uuid);

grant execute on function public.criar_aluno(text, text, text, uuid, text) to authenticated;

create or replace function public.vincular_aluno_por_email(
  p_aluno_id uuid,
  p_email text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professor_id uuid;
begin
  if not exists (
    select 1 from public.aluno_professor
    where aluno_id = p_aluno_id and professor_id = auth.uid()
  ) then
    raise exception 'Você não tem acesso a este aluno';
  end if;

  select id into v_professor_id from auth.users where email = p_email limit 1;

  if v_professor_id is null then
    raise exception 'Nenhuma professora encontrada com esse e-mail';
  end if;

  insert into public.aluno_professor (aluno_id, professor_id)
  values (p_aluno_id, v_professor_id)
  on conflict (aluno_id, professor_id) do nothing;

  return true;
end;
$$;

grant execute on function public.vincular_aluno_por_email(uuid, text) to authenticated;

-- Chamada pela professora ao clicar em "Vincular" no e-mail do aluno: salva
-- o e-mail e já tenta achar a conta agora (em vez de só esperar o próximo
-- login do aluno pra rodar vincular_conta_aluno). Retorna 'vinculado',
-- 'nao_encontrado' (a pessoa ainda não criou a conta - o vínculo ainda
-- acontece sozinho quando ela criar), 'sem_email' ou 'email_em_uso' (já
-- pertence a outro aluno - um e-mail só pode estar vinculado a um aluno).
create or replace function public.vincular_conta_aluno_por_professora(
  p_aluno_id uuid,
  p_email text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := nullif(trim(p_email), '');
  v_user_id uuid;
begin
  if not exists (
    select 1 from public.aluno_professor
    where aluno_id = p_aluno_id and professor_id = auth.uid()
  ) then
    raise exception 'Você não tem acesso a este aluno';
  end if;

  begin
    update public.alunos set email = v_email where id = p_aluno_id;
  exception
    when unique_violation then
      return 'email_em_uso';
  end;

  if v_email is null then
    return 'sem_email';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(v_email) limit 1;

  if v_user_id is null then
    return 'nao_encontrado';
  end if;

  update public.alunos set user_id = v_user_id where id = p_aluno_id;
  return 'vinculado';
end;
$$;

grant execute on function public.vincular_conta_aluno_por_professora(uuid, text) to authenticated;

-- Chamada pela própria conta de aluno logo depois do cadastro: acha o
-- registro de aluno com o mesmo e-mail dessa conta e ainda sem user_id, e
-- vincula. Como um e-mail só pode estar em um aluno (índice único acima),
-- isso nunca linka mais de uma linha.
create or replace function public.vincular_conta_aluno()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_count integer;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return 0;
  end if;

  update public.alunos
  set user_id = auth.uid()
  where user_id is null and email is not null and lower(email) = lower(v_email);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.vincular_conta_aluno() to authenticated;

-- ---------------------------------------------------------------------
-- RLS: cada professora só vê o que é dela. alunos são a exceção parcial -
-- visíveis pra qualquer professora vinculada via aluno_professor, mas só
-- criáveis pela função criar_aluno acima (por isso não tem policy de
-- insert nessa tabela). Cada aluno logado (alunos.user_id = auth.uid())
-- também enxerga (e, no caso de tarefas, edita a conclusão) o que é dele -
-- essas policies de leitura do aluno se somam às da professora, nunca
-- substituem.
-- ---------------------------------------------------------------------

alter table public.turmas enable row level security;
alter table public.alunos enable row level security;
alter table public.aluno_professor enable row level security;
alter table public.aulas enable row level security;
alter table public.tarefas_aula enable row level security;
alter table public.vocabulario enable row level security;
alter table public.pagamentos enable row level security;
alter table public.materiais enable row level security;
alter table public.erros_aula enable row level security;

drop policy if exists "turmas_all_own" on public.turmas;
create policy "turmas_all_own" on public.turmas for all to authenticated
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());

drop policy if exists "aluno_professor_all_own" on public.aluno_professor;
create policy "aluno_professor_all_own" on public.aluno_professor for all to authenticated
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());

drop policy if exists "alunos_select_vinculado" on public.alunos;
create policy "alunos_select_vinculado" on public.alunos for select to authenticated
  using (
    exists (
      select 1 from public.aluno_professor ap
      where ap.aluno_id = alunos.id and ap.professor_id = auth.uid()
    )
    or alunos.user_id = auth.uid()
  );

drop policy if exists "alunos_update_vinculado" on public.alunos;
create policy "alunos_update_vinculado" on public.alunos for update to authenticated
  using (exists (
    select 1 from public.aluno_professor ap
    where ap.aluno_id = alunos.id and ap.professor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.aluno_professor ap
    where ap.aluno_id = alunos.id and ap.professor_id = auth.uid()
  ));

drop policy if exists "aulas_all_own" on public.aulas;
create policy "aulas_all_own" on public.aulas for all to authenticated
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());

drop policy if exists "tarefas_aula_all_own" on public.tarefas_aula;
create policy "tarefas_aula_all_own" on public.tarefas_aula for all to authenticated
  using (exists (
    select 1 from public.aulas where aulas.id = tarefas_aula.aula_id and aulas.professor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.aulas where aulas.id = tarefas_aula.aula_id and aulas.professor_id = auth.uid()
  ));

drop policy if exists "vocabulario_all_own" on public.vocabulario;
create policy "vocabulario_all_own" on public.vocabulario for all to authenticated
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());

drop policy if exists "pagamentos_all_own" on public.pagamentos;
create policy "pagamentos_all_own" on public.pagamentos for all to authenticated
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());

drop policy if exists "materiais_all_own" on public.materiais;
create policy "materiais_all_own" on public.materiais for all to authenticated
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());

drop policy if exists "erros_aula_all_own" on public.erros_aula;
create policy "erros_aula_all_own" on public.erros_aula for all to authenticated
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());

-- ---------------------------------------------------------------------
-- RLS adicional pro aluno logado (soma às policies das professoras acima -
-- nunca substitui). Só leitura, exceto tarefas_aula, onde o aluno pode
-- marcar a própria tarefa como concluída.
-- ---------------------------------------------------------------------

drop policy if exists "aulas_select_aluno" on public.aulas;
create policy "aulas_select_aluno" on public.aulas for select to authenticated
  using (exists (
    select 1 from public.alunos a where a.id = aulas.aluno_id and a.user_id = auth.uid()
  ));

drop policy if exists "tarefas_aula_select_aluno" on public.tarefas_aula;
create policy "tarefas_aula_select_aluno" on public.tarefas_aula for select to authenticated
  using (exists (
    select 1 from public.aulas au
    join public.alunos a on a.id = au.aluno_id
    where au.id = tarefas_aula.aula_id and a.user_id = auth.uid()
  ));

drop policy if exists "tarefas_aula_update_aluno" on public.tarefas_aula;
create policy "tarefas_aula_update_aluno" on public.tarefas_aula for update to authenticated
  using (exists (
    select 1 from public.aulas au
    join public.alunos a on a.id = au.aluno_id
    where au.id = tarefas_aula.aula_id and a.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.aulas au
    join public.alunos a on a.id = au.aluno_id
    where au.id = tarefas_aula.aula_id and a.user_id = auth.uid()
  ));

drop policy if exists "vocabulario_select_aluno" on public.vocabulario;
create policy "vocabulario_select_aluno" on public.vocabulario for select to authenticated
  using (exists (
    select 1 from public.alunos a where a.id = vocabulario.aluno_id and a.user_id = auth.uid()
  ));

drop policy if exists "pagamentos_select_aluno" on public.pagamentos;
create policy "pagamentos_select_aluno" on public.pagamentos for select to authenticated
  using (exists (
    select 1 from public.alunos a where a.id = pagamentos.aluno_id and a.user_id = auth.uid()
  ));

drop policy if exists "erros_aula_select_aluno" on public.erros_aula;
create policy "erros_aula_select_aluno" on public.erros_aula for select to authenticated
  using (exists (
    select 1 from public.alunos a where a.id = erros_aula.aluno_id and a.user_id = auth.uid()
  ));
