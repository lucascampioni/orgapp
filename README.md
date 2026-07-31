## Painel de Tarefas

Quadro Kanban (App Router + TypeScript + Tailwind) com login via Supabase Auth.

### Configuração

1. Copie `.env.example` para `.env.local` e preencha com as credenciais do seu projeto Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

2. Rode `supabase/schema.sql` no SQL Editor do seu projeto Supabase (cria a tabela `tasks`, as políticas de RLS e os cards iniciais).

3. Crie os usuários que poderão logar em **Authentication → Users** no painel do Supabase (não há cadastro público pelo app).

### Desenvolvimento

```
npm install
npm run dev
```

### Deploy

Pronto para deploy na [Vercel](https://vercel.com/new): configure as duas variáveis de ambiente acima nas configurações do projeto.

Garanta que o **Framework Preset** do projeto na Vercel esteja definido como **Next.js** (e sem um "Output Directory" manual apontando para `public`) — o preset errado faz a build falhar com "No Output Directory named 'public' found".
