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

### Gravação e resumo de aulas com IA (opcional)

Uma aula com um link do Google Meet cadastrado pode ter um bot (via [Recall.ai](https://recall.ai)) entrando pra gravar/transcrever, e a transcrição vira automaticamente um resumo + tarefas de acompanhamento (via API da Anthropic) na própria aula. Isso é opcional — sem essas variáveis o resto do app funciona normalmente, só o botão "Iniciar gravação com IA" não funciona.

Variáveis necessárias (`.env.local` e nas env vars da Vercel):

```
SUPABASE_SERVICE_ROLE_KEY=...   # Project Settings → API → service_role (secreta!)
RECALL_API_KEY=...              # conta no recall.ai
RECALL_REGION=us-west-2         # us-east-1, us-west-2, eu-central-1 ou ap-northeast-1 — aparece na própria URL do dashboard do Recall.ai
RECALL_WEBHOOK_SECRET=whsec_... # "Verification Secret" do dashboard do Recall.ai (Developers > API Keys & Secrets) — NÃO é uma string escolhida por você
ANTHROPIC_API_KEY=...           # console.anthropic.com
```

**Passo extra obrigatório**: no dashboard do Recall.ai, em **Webhooks**, cadastre a URL `https://SEU-DOMINIO/api/recall/webhook` (produção) para receber o evento de fim de gravação/transcrição — sem isso o app nunca fica sabendo que a aula terminou, mesmo com o bot entrando certinho na call.

**Atenção**: `lib/recall.ts` foi escrito sem acesso à documentação ao vivo do Recall.ai — confira em https://docs.recall.ai se os endpoints e o formato do webhook ainda batem, e teste com uma reunião real antes de confiar no fluxo em produção. A API do Recall.ai é dividida por região; se der erro 401 "Invalid API token... might be for another Recall region", ajuste `RECALL_REGION`. Se as variáveis forem "Shared" (nível de time), edite o valor em Team Settings → Environment Variables → Shared — a aba do projeto não mostra nem permite recriar uma variável já herdada do time.

### Desenvolvimento

```
npm install
npm run dev
```

### Deploy

Pronto para deploy na [Vercel](https://vercel.com/new). Checklist:

1. **Environment Variables**: adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para os ambientes Production e Preview. Se forem variáveis "Shared" (nível de time), confirme que estão **linkadas ao projeto** (Team Settings → Environment Variables → Shared → Link to Projects) — só existir no time não é suficiente. Sem isso o app retorna 500 em qualquer rota (o `proxy.ts` roda em toda requisição e precisa dessas variáveis).
2. **Framework Preset**: em Settings → Build and Deployment, garanta que está como **Next.js** (e sem "Output Directory" manual apontando para `public`) — o preset errado faz a build falhar com "No Output Directory named 'public' found".
