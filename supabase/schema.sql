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
alter table public.alunos add column if not exists data_nascimento date;
alter table public.alunos add column if not exists sexo text check (
  sexo in ('feminino', 'masculino', 'outro', 'prefiro_nao_dizer')
);

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

-- Tarefa deixa de ser só um checklist: pode pedir uma resposta de verdade
-- do aluno (dissertativa ou múltipla escolha), não só marcar "feito".
alter table public.tarefas_aula add column if not exists tipo text not null default 'checklist'
  check (tipo in ('checklist', 'dissertativa', 'multipla_escolha'));
alter table public.tarefas_aula add column if not exists opcoes text[];
alter table public.tarefas_aula add column if not exists resposta_correta text;
alter table public.tarefas_aula add column if not exists resposta_aluno text;

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

-- Da mesma forma, uma conta de aluno (user_id) só pode estar vinculada a um
-- cadastro. Isso pode já ter ficado inconsistente antes desse índice
-- existir (ex: a mesma conta linkada em vários cadastros de teste com o
-- mesmo e-mail, quando isso ainda era permitido) - limpa mantendo o
-- vínculo só na linha que ainda tem o e-mail batendo (ou a mais antiga).
with duplicados_conta as (
  select id, row_number() over (
    partition by user_id
    order by (email is not null) desc, criado_em asc
  ) as rn
  from public.alunos
  where user_id is not null
)
update public.alunos a
set user_id = null
from duplicados_conta d
where a.id = d.id and d.rn > 1;

create unique index if not exists alunos_user_id_unique_idx on public.alunos (user_id)
  where user_id is not null;

-- ---------------------------------------------------------------------
-- Funções (SECURITY DEFINER só pra atravessar o "ovo e a galinha" de criar
-- um aluno + seu vínculo, ou compartilhar um aluno com outra professora sem
-- dar acesso de leitura livre à tabela auth.users).
-- ---------------------------------------------------------------------

-- Idioma que aquela professora ensina pra aquele aluno - mora no vínculo
-- (aluno_professor), não no aluno nem na professora, porque o mesmo aluno
-- pode aprender idiomas diferentes com professoras diferentes (ex: inglês
-- com uma, espanhol com outra). professor_nome é uma cópia (não
-- atualizada automaticamente se a professora trocar de nome depois) só pra
-- o aluno conseguir ver de quem é cada vínculo sem precisar de acesso de
-- leitura à tabela professores de outra conta.
alter table public.aluno_professor add column if not exists idioma text;
alter table public.aluno_professor add column if not exists professor_nome text;
alter table public.convites add column if not exists idioma text;

create or replace function public.criar_aluno(
  p_nome text,
  p_contato text default null,
  p_observacoes text default null,
  p_turma_id uuid default null,
  p_email text default null,
  p_idioma text default null
)
returns public.alunos
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_aluno public.alunos;
  v_professor_nome text;
begin
  insert into public.alunos (nome, contato, observacoes, email)
  values (
    p_nome,
    nullif(trim(coalesce(p_contato, '')), ''),
    nullif(trim(coalesce(p_observacoes, '')), ''),
    nullif(trim(coalesce(p_email, '')), '')
  )
  returning * into novo_aluno;

  select coalesce(p.nome, split_part(u.email, '@', 1))
  into v_professor_nome
  from auth.users u
  left join public.professores p on p.id = u.id
  where u.id = auth.uid();

  insert into public.aluno_professor (aluno_id, professor_id, turma_id, idioma, professor_nome)
  values (novo_aluno.id, auth.uid(), p_turma_id, nullif(trim(coalesce(p_idioma, '')), ''), v_professor_nome);

  return novo_aluno;
exception
  when unique_violation then
    raise exception 'Esse e-mail já está vinculado a outro aluno';
end;
$$;

-- versões anteriores (assinaturas diferentes) ficam órfãs se não forem
-- removidas - "create or replace" não substitui quando os parâmetros mudam.
drop function if exists public.criar_aluno(text, text, text, uuid);
drop function if exists public.criar_aluno(text, text, text, uuid, text);

grant execute on function public.criar_aluno(text, text, text, uuid, text, text) to authenticated;

-- "Compartilhar aluno com outra professora" foi removido: cada professora
-- vincula o mesmo aluno de forma independente (convidando por e-mail), o
-- aluno aceita cada convite separadamente - uma professora não pode mais
-- dar acesso a outra sem o aluno confirmar.
drop function if exists public.vincular_aluno_por_email(uuid, text);

-- As duas funções abaixo (vincular_conta_aluno_por_professora e
-- vincular_conta_aluno) vinculavam a conta do aluno automaticamente só por
-- bater o e-mail, sem o aluno confirmar nada - trocadas pelo sistema de
-- convite abaixo (tabela convites + convidar_aluno + responder_convite),
-- onde o aluno precisa aceitar antes de qualquer vínculo virar valendo.
drop function if exists public.vincular_conta_aluno_por_professora(uuid, text);
drop function if exists public.vincular_conta_aluno();

-- ---------------------------------------------------------------------
-- Convites: toda vez que uma professora informa o e-mail de um aluno (seja
-- criando um cadastro novo já com e-mail, seja vinculando o e-mail depois
-- no perfil), isso vira um convite pendente em vez de um vínculo
-- automático. O aluno só passa a aparecer pra essa professora (e só ganha
-- acesso à própria conta) depois de aceitar.
-- ---------------------------------------------------------------------

create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  professor_id uuid not null references auth.users(id) on delete cascade,
  professor_nome text,
  email text not null,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado')),
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  unique (aluno_id, professor_id)
);

alter table public.convites enable row level security;

drop policy if exists "convites_select_professor" on public.convites;
create policy "convites_select_professor" on public.convites for select to authenticated
  using (professor_id = auth.uid());

-- O aluno enxerga convite endereçado ao e-mail da própria conta logada
-- (auth.jwt() traz o e-mail sem precisar de select em auth.users aqui).
drop policy if exists "convites_select_aluno" on public.convites;
create policy "convites_select_aluno" on public.convites for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- Chamada pela professora: com p_aluno_id (perfil que ela já tem - caso do
-- "Vincular conta do aluno" no perfil) ou sem (caso do "aluno já tem
-- cadastro" na hora de adicionar, aí acha/cria o registro pelo e-mail).
-- Nos dois casos só cria o convite - o vínculo de verdade (aluno_professor
-- e/ou user_id) só acontece quando o aluno aceitar, em responder_convite.
create or replace function public.convidar_aluno(
  p_email text,
  p_nome text default null,
  p_aluno_id uuid default null,
  p_idioma text default null
)
returns public.convites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := nullif(trim(p_email), '');
  v_aluno_id uuid := p_aluno_id;
  v_idioma text := nullif(trim(coalesce(p_idioma, '')), '');
  v_professor_nome text;
  v_convite public.convites;
begin
  if v_email is null then
    raise exception 'E-mail é obrigatório';
  end if;

  if v_aluno_id is not null and not exists (
    select 1 from public.aluno_professor
    where aluno_id = v_aluno_id and professor_id = auth.uid()
  ) then
    raise exception 'Você não tem acesso a este aluno';
  end if;

  if v_aluno_id is null then
    select id into v_aluno_id from public.alunos where lower(email) = lower(v_email);
  end if;

  if v_aluno_id is null then
    insert into public.alunos (nome, email)
    values (coalesce(nullif(trim(p_nome), ''), split_part(v_email, '@', 1)), v_email)
    returning id into v_aluno_id;
  else
    begin
      update public.alunos set email = v_email
      where id = v_aluno_id and (email is null or lower(email) <> lower(v_email));
    exception
      when unique_violation then
        raise exception 'Esse e-mail já está vinculado a outro aluno';
    end;
  end if;

  -- Contas de professora criadas antes do cadastro público existir (ex: via
  -- painel do Supabase) não têm linha em public.professores - cai pro
  -- prefixo do e-mail nesse caso, pra nunca mostrar em branco pro aluno.
  select coalesce(p.nome, split_part(u.email, '@', 1))
  into v_professor_nome
  from auth.users u
  left join public.professores p on p.id = u.id
  where u.id = auth.uid();

  -- O vínculo (aluno_professor) já é criado aqui, na hora do convite - não
  -- espera o aceite. Só a conta de login (alunos.user_id) depende do aceite
  -- do aluno; a professora já pode editar a aba desse aluno (aulas,
  -- vocabulário etc.) enquanto o convite fica "pendente" só como indicação
  -- visual, não como bloqueio de acesso.
  insert into public.aluno_professor (aluno_id, professor_id, idioma, professor_nome)
  values (v_aluno_id, auth.uid(), v_idioma, v_professor_nome)
  on conflict (aluno_id, professor_id) do update
    set idioma = excluded.idioma, professor_nome = excluded.professor_nome;

  insert into public.convites (aluno_id, professor_id, professor_nome, email, idioma)
  values (v_aluno_id, auth.uid(), v_professor_nome, v_email, v_idioma)
  on conflict (aluno_id, professor_id) do update
    set email = excluded.email, professor_nome = excluded.professor_nome, idioma = excluded.idioma,
        status = 'pendente', respondido_em = null, criado_em = now()
  returning * into v_convite;

  return v_convite;
end;
$$;

drop function if exists public.convidar_aluno(text, text, uuid);

grant execute on function public.convidar_aluno(text, text, uuid, text) to authenticated;

-- Chamada pelo aluno pra aceitar ou recusar um convite endereçado a ele.
-- Aceitar cria o vínculo aluno_professor (se ainda não existir) e liga a
-- conta logada ao perfil (user_id), tudo de uma vez.
create or replace function public.responder_convite(p_convite_id uuid, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convite public.convites;
  v_email text;
begin
  select * into v_convite from public.convites where id = p_convite_id;
  if v_convite is null then
    raise exception 'Convite não encontrado';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  if v_email is null or lower(v_email) <> lower(v_convite.email) then
    raise exception 'Esse convite não é seu';
  end if;

  if v_convite.status <> 'pendente' then
    raise exception 'Esse convite já foi respondido';
  end if;

  if p_aceitar then
    begin
      update public.alunos set user_id = auth.uid() where id = v_convite.aluno_id and user_id is null;
    exception
      when unique_violation then
        raise exception 'Essa conta já está vinculada a outro cadastro de aluno';
    end;

    insert into public.aluno_professor (aluno_id, professor_id, idioma, professor_nome)
    values (v_convite.aluno_id, v_convite.professor_id, v_convite.idioma, v_convite.professor_nome)
    on conflict (aluno_id, professor_id) do nothing;

    update public.convites set status = 'aceito', respondido_em = now() where id = p_convite_id;
  else
    update public.convites set status = 'recusado', respondido_em = now() where id = p_convite_id;
  end if;
end;
$$;

grant execute on function public.responder_convite(uuid, boolean) to authenticated;

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

-- Policies antigas de antes do sistema multi-professora (geradas pelo
-- template padrão do Supabase, tudo "true" pra authenticated) - deixavam
-- qualquer professora ver/editar/apagar dado de qualquer outra. Removidas
-- aqui pra sempre, mesmo que reapareçam manualmente por engano de novo.
drop policy if exists "alunos_select_authenticated" on public.alunos;
drop policy if exists "alunos_insert_authenticated" on public.alunos;
drop policy if exists "alunos_update_authenticated" on public.alunos;
drop policy if exists "alunos_delete_authenticated" on public.alunos;
drop policy if exists "aulas_select_authenticated" on public.aulas;
drop policy if exists "aulas_insert_authenticated" on public.aulas;
drop policy if exists "aulas_update_authenticated" on public.aulas;
drop policy if exists "aulas_delete_authenticated" on public.aulas;
drop policy if exists "materiais_select_authenticated" on public.materiais;
drop policy if exists "materiais_insert_authenticated" on public.materiais;
drop policy if exists "materiais_update_authenticated" on public.materiais;
drop policy if exists "materiais_delete_authenticated" on public.materiais;
drop policy if exists "tarefas_aula_select_authenticated" on public.tarefas_aula;
drop policy if exists "tarefas_aula_insert_authenticated" on public.tarefas_aula;
drop policy if exists "tarefas_aula_update_authenticated" on public.tarefas_aula;
drop policy if exists "tarefas_aula_delete_authenticated" on public.tarefas_aula;
drop policy if exists "turmas_select_authenticated" on public.turmas;
drop policy if exists "turmas_insert_authenticated" on public.turmas;
drop policy if exists "turmas_update_authenticated" on public.turmas;
drop policy if exists "turmas_delete_authenticated" on public.turmas;

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

-- O próprio aluno também pode editar o próprio perfil (nome, data de
-- nascimento, sexo, contato, foto) mesmo antes de ter qualquer vínculo com
-- uma professora - soma-se à policy acima, nunca substitui.
drop policy if exists "alunos_update_self" on public.alunos;
create policy "alunos_update_self" on public.alunos for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Idem pro insert: usado pelo upsert em AlunoMeuPerfilView pra contas
-- antigas de aluno que ainda não têm linha em alunos (o trigger que cria
-- isso automaticamente só existe pra cadastros feitos depois dele).
drop policy if exists "alunos_insert_self" on public.alunos;
create policy "alunos_insert_self" on public.alunos for insert to authenticated
  with check (user_id = auth.uid());

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

-- Precisa enxergar os próprios vínculos (um por professora) pra montar o
-- seletor de "perfil" (idioma + professora) no portal do aluno. Não dá pra
-- fazer isso com um EXISTS direto em public.alunos aqui: a policy de select
-- de alunos (alunos_select_vinculado, acima) já consulta aluno_professor,
-- então um EXISTS em alunos dentro da policy de aluno_professor criaria um
-- ciclo A→B→A ("infinite recursion detected in policy") - toda consulta em
-- alunos/aluno_professor/aulas/tarefas_aula passava a falhar. Por isso o
-- lookup do aluno_id do usuário logado mora numa função SECURITY DEFINER
-- (ignora RLS só nessa consulta pontual e bem restrita), quebrando o ciclo.
create or replace function public.aluno_id_do_usuario_atual()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.alunos where user_id = auth.uid();
$$;

grant execute on function public.aluno_id_do_usuario_atual() to authenticated;

drop policy if exists "aluno_professor_select_aluno" on public.aluno_professor;
create policy "aluno_professor_select_aluno" on public.aluno_professor for select to authenticated
  using (aluno_id = public.aluno_id_do_usuario_atual());

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

-- ---------------------------------------------------------------------
-- Integração com Google Calendar (opcional - ver README).
-- ---------------------------------------------------------------------

-- Tokens OAuth da conta Google de cada professora. access_token expira
-- rápido (é renovado via refresh_token nas rotas de API, não aqui).
create table if not exists public.google_conexoes (
  professor_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  access_token text not null,
  refresh_token text,
  expiry timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Vínculo entre um evento recorrente do Google Calendar e um aluno: toda
-- ocorrência futura desse evento vira uma aula automaticamente ao
-- sincronizar (ver /api/google/sincronizar).
create table if not exists public.google_vinculos (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  google_recurring_event_id text not null,
  titulo text,
  criado_em timestamptz not null default now(),
  unique (professor_id, google_recurring_event_id)
);

-- Referência à ocorrência do Google que gerou a aula, pra sincronizar de
-- novo sem duplicar.
alter table public.aulas add column if not exists google_event_id text;
create unique index if not exists aulas_google_event_unique_idx
  on public.aulas (professor_id, google_event_id)
  where google_event_id is not null;

alter table public.google_conexoes enable row level security;
alter table public.google_vinculos enable row level security;

drop policy if exists "google_conexoes_all_own" on public.google_conexoes;
create policy "google_conexoes_all_own" on public.google_conexoes for all to authenticated
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());

drop policy if exists "google_vinculos_all_own" on public.google_vinculos;
create policy "google_vinculos_all_own" on public.google_vinculos for all to authenticated
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());

-- Horário da aula (a data já existia, mas era só a data sem hora - útil
-- pra aulas importadas do Google Calendar, que sempre têm hora marcada).
alter table public.aulas add column if not exists horario text;

-- ---------------------------------------------------------------------
-- Perfil da professora + cadastro fechado (só quem o admin liberou pode
-- criar conta de professora - ver README pra como liberar um e-mail).
-- ---------------------------------------------------------------------

create table if not exists public.professores (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  data_nascimento date,
  sexo text check (sexo in ('feminino', 'masculino', 'outro', 'prefiro_nao_dizer')),
  criado_em timestamptz not null default now()
);

alter table public.professores enable row level security;

drop policy if exists "professores_select_own" on public.professores;
create policy "professores_select_own" on public.professores for select to authenticated
  using (id = auth.uid());

drop policy if exists "professores_update_own" on public.professores;
create policy "professores_update_own" on public.professores for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Contas de professora criadas antes do trigger criar_perfil_professor
-- existir (ex: direto pelo painel do Supabase) não têm linha aqui ainda -
-- essa policy permite a tela de "Meu perfil" criar via upsert na primeira
-- vez que a professora salva alguma coisa.
drop policy if exists "professores_insert_own" on public.professores;
create policy "professores_insert_own" on public.professores for insert to authenticated
  with check (id = auth.uid());

-- Lista de e-mails liberados pelo admin pra virar professora. Sem policy
-- nenhuma de propósito - só a função abaixo (security definer) enxerga essa
-- tabela; ninguém autenticado consegue ler ou escrever nela direto pela API.
-- Pra liberar um e-mail: insert into public.professoras_permitidas (email)
-- values ('email@exemplo.com');
create table if not exists public.professoras_permitidas (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nome text,
  criado_em timestamptz not null default now()
);

alter table public.professoras_permitidas enable row level security;

-- Roda ANTES do Supabase criar a conta em auth.users: se não for cadastro
-- de aluno (sem role='aluno' nos metadados) e o e-mail não estiver
-- liberado, cancela a criação da conta levantando uma exceção. O app
-- reconhece essa mensagem específica pra mostrar um aviso amigável.
create or replace function public.checar_professora_liberada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data->>'role' is distinct from 'aluno' then
    if not exists (
      select 1 from public.professoras_permitidas where lower(email) = lower(new.email)
    ) then
      raise exception 'professora_nao_liberada' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists checar_professora_liberada_trigger on auth.users;
create trigger checar_professora_liberada_trigger
  before insert on auth.users
  for each row execute function public.checar_professora_liberada();

-- Roda DEPOIS que a conta é criada em auth.users: se for cadastro de
-- professora (passou pela checagem acima), cria o perfil correspondente em
-- public.professores a partir dos metadados enviados no signUp.
create or replace function public.criar_perfil_professor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data->>'role' is distinct from 'aluno' then
    insert into public.professores (id, nome, data_nascimento, sexo)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1)),
      nullif(new.raw_user_meta_data->>'data_nascimento', '')::date,
      nullif(new.raw_user_meta_data->>'sexo', '')
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists criar_perfil_professor_trigger on auth.users;
create trigger criar_perfil_professor_trigger
  after insert on auth.users
  for each row execute function public.criar_perfil_professor();

-- Mesma ideia pro cadastro de aluno: cria a linha em public.alunos com os
-- dados coletados no formulário (nome, data de nascimento, sexo) assim que
-- a conta é criada, em vez de só quando uma professora convida esse aluno -
-- assim o aluno consegue ver e editar o próprio perfil mesmo sem nenhum
-- vínculo ainda. Se já existir uma linha com esse e-mail (criada antes por
-- uma professora via convite, ainda sem user_id), linka nela em vez de
-- duplicar - mesma lógica de "encontra ou cria" usada em convidar_aluno.
create or replace function public.criar_perfil_aluno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existente uuid;
begin
  if new.raw_user_meta_data->>'role' = 'aluno' then
    select id into v_existente from public.alunos where lower(email) = lower(new.email);

    if v_existente is not null then
      update public.alunos set user_id = coalesce(user_id, new.id) where id = v_existente;
    else
      insert into public.alunos (nome, email, user_id, data_nascimento, sexo)
      values (
        coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1)),
        new.email,
        new.id,
        nullif(new.raw_user_meta_data->>'data_nascimento', '')::date,
        nullif(new.raw_user_meta_data->>'sexo', '')
      )
      on conflict (user_id) where user_id is not null do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists criar_perfil_aluno_trigger on auth.users;
create trigger criar_perfil_aluno_trigger
  after insert on auth.users
  for each row execute function public.criar_perfil_aluno();

-- Backfill pra contas de aluno criadas antes desse trigger existir: cria a
-- linha em public.alunos que nunca chegou a ser criada (mesma lógica do
-- trigger acima).
do $$
declare
  u record;
  v_existente uuid;
begin
  for u in
    select id, email, raw_user_meta_data
    from auth.users au
    where au.raw_user_meta_data->>'role' = 'aluno'
      and not exists (select 1 from public.alunos a where a.user_id = au.id)
  loop
    select id into v_existente from public.alunos where lower(email) = lower(u.email);

    if v_existente is not null then
      update public.alunos set user_id = coalesce(user_id, u.id) where id = v_existente;
    else
      insert into public.alunos (nome, email, user_id, data_nascimento, sexo)
      values (
        coalesce(nullif(trim(u.raw_user_meta_data->>'nome'), ''), split_part(u.email, '@', 1)),
        u.email,
        u.id,
        nullif(u.raw_user_meta_data->>'data_nascimento', '')::date,
        nullif(u.raw_user_meta_data->>'sexo', '')
      )
      on conflict (user_id) where user_id is not null do nothing;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Foto de perfil (professora e aluno) - guardada no bucket "avatars" do
-- Storage, um arquivo por usuário em "<user_id>/arquivo.ext" (upsert,
-- então trocar a foto sobrescreve a anterior em vez de acumular lixo).
-- ---------------------------------------------------------------------

alter table public.professores add column if not exists foto_url text;
alter table public.alunos add column if not exists foto_url text;

-- Contato (telefone/WhatsApp) é dado pessoal - só a própria pessoa
-- preenche, no cadastro ou na aba "Meu perfil" (a professora não edita o
-- contato do aluno, nem vice-versa).
alter table public.professores add column if not exists contato text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_leitura_publica" on storage.objects;
create policy "avatars_leitura_publica" on storage.objects for select
  using (bucket_id = 'avatars');

-- Só dá pra escrever dentro da própria "pasta" (primeiro pedaço do path =
-- o próprio user id), tanto pra professora quanto pra aluno.
drop policy if exists "avatars_upload_proprio" on storage.objects;
create policy "avatars_upload_proprio" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_proprio" on storage.objects;
create policy "avatars_update_proprio" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_proprio" on storage.objects;
create policy "avatars_delete_proprio" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
