## Painel da Professora

Ferramenta (App Router + TypeScript + Tailwind) para professoras de inglês organizarem turmas, alunos, planos de aula e um banco de vocabulário/exercícios, com login via Supabase Auth.

### Configuração

1. Copie `.env.example` para `.env.local` e preencha com as credenciais do seu projeto Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

2. Rode `supabase/schema.sql` no SQL Editor do seu projeto Supabase (cria as tabelas `turmas`, `alunos`, `aulas` e `materiais`, com RLS para usuários autenticados).

3. Crie os usuários que poderão logar em **Authentication → Users** no painel do Supabase (não há cadastro público pelo app).

### Desenvolvimento

```
npm install
npm run dev
```

### Deploy

Pronto para deploy na [Vercel](https://vercel.com/new). Checklist:

1. **Environment Variables**: adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para os ambientes Production e Preview. Se forem variáveis "Shared" (nível de time), confirme que estão **linkadas ao projeto** (Team Settings → Environment Variables → Shared → Link to Projects) — só existir no time não é suficiente. Sem isso o app retorna 500 em qualquer rota (o `proxy.ts` roda em toda requisição e precisa dessas variáveis).
2. **Framework Preset**: em Settings → Build and Deployment, garanta que está como **Next.js** (e sem "Output Directory" manual apontando para `public`) — o preset errado faz a build falhar com "No Output Directory named 'public' found".
