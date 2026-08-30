## Lumina

Ferramenta (App Router + TypeScript + Tailwind) para professoras de inglês organizarem alunos, aulas, vocabulário e pagamentos, com login via Supabase Auth.

Cada professora só vê os alunos vinculados a ela; um mesmo aluno pode ser vinculado a mais de uma professora (por exemplo, duas professoras diferentes dando aula pro mesmo aluno) - nesse caso, o cadastro básico do aluno (nome/contato) é compartilhado, mas aulas, tarefas, vocabulário e pagamentos são particulares de cada vínculo.

### Configuração

1. Copie `.env.example` para `.env.local` e preencha com as credenciais do seu projeto Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

2. Rode `supabase/schema.sql` no SQL Editor do seu projeto Supabase. **Atenção se você já tinha um banco de uma versão anterior**: esse script faz uma migração de dados (cria `aluno_professor`, `vocabulario`, `pagamentos`, adiciona `professor_id`/`aluno_id`, e faz backfill assumindo que só existe uma professora usando o banco até agora). Depois de rodar, abra cada aluno e confira se as aulas antigas ficaram vinculadas certinho (aba Aulas do perfil) - aulas de turmas com mais de um aluno não dá pra migrar automaticamente.

3. Crie os usuários **professora** em **Authentication → Users** no painel do Supabase (continua sem cadastro público pra professora). Alunos se cadastram sozinhos pelo próprio app, em `/cadastro`.

### Cadastro de alunos

Em `/cadastro`, quem escolhe "Sou aluno(a)" cria a própria conta (nome, e-mail, senha). O vínculo com o cadastro que a professora já fez desse aluno (nome/observações) acontece automaticamente comparando e-mails - a professora precisa ter preenchido o campo "E-mail do aluno" no perfil dele (aba Visão geral) com o mesmo e-mail que o aluno vai usar pra criar a conta. A conta do aluno só enxerga (e, no caso de tarefas, só marca como concluída) o que já existe - não edita cadastro, aulas ou pagamentos.

Se o seu projeto Supabase tiver "Confirm email" ativado (Authentication → Providers → Email), o aluno recebe um e-mail de confirmação antes de conseguir entrar - confira em **Authentication → URL Configuration** se o **Site URL** aponta pra sua URL de produção (não `localhost`), senão o link do e-mail leva pro lugar errado.

### Gravação e resumo de aulas com IA (opcional)

Uma aula com um link do Google Meet cadastrado pode ter um bot (via [Recall.ai](https://recall.ai)) entrando pra gravar/transcrever, e a transcrição vira automaticamente um resumo + tarefas de acompanhamento + vocabulário novo identificado (tudo via API da Anthropic) na própria aula e no perfil do aluno. Isso é opcional — sem essas variáveis o resto do app funciona normalmente, só o botão "Iniciar gravação com IA" não funciona.

Variáveis necessárias (`.env.local` e nas env vars da Vercel):

```
SUPABASE_SERVICE_ROLE_KEY=...   # Project Settings → API → service_role (secreta!)
RECALL_API_KEY=...              # conta no recall.ai
RECALL_REGION=us-west-2         # us-east-1, us-west-2, eu-central-1 ou ap-northeast-1 — aparece na própria URL do dashboard do Recall.ai
RECALL_WEBHOOK_SECRET=whsec_... # "Verification Secret" do dashboard do Recall.ai (Developers > API Keys & Secrets) — NÃO é uma string escolhida por você
ANTHROPIC_API_KEY=...           # console.anthropic.com
```

**Passo extra obrigatório**: no dashboard do Recall.ai, em **Webhooks**, cadastre a URL `https://SEU-DOMINIO/api/recall/webhook` (produção) para receber o evento de fim de gravação/transcrição — sem isso o app nunca fica sabendo que a aula terminou, mesmo com o bot entrando certinho na call.

**Atenção**: `lib/recall.ts` foi escrito sem acesso à documentação ao vivo do Recall.ai — confira em https://docs.recall.ai se os endpoints e o formato do webhook ainda batem, e teste com uma reunião real antes de confiar no fluxo em produção. A API do Recall.ai é dividida por região; se der erro 401 "Invalid API token... might be for another Recall region", ajuste `RECALL_REGION`. Se as variáveis forem "Shared" (nível de time), edite o valor em Team Settings → Environment Variables → Shared — a aba do projeto não mostra nem permite recriar uma variável já herdada do time. **Importante**: uma variável "Shared" só chega no projeto se estiver com o campo "Link to Projects" preenchido com esse projeto — sem isso ela existe no time mas chega vazia (`""`) em runtime, sem erro nenhum na hora de salvar.

**Transcrição**: além de cadastrar as credenciais da Gladia em Setup & Integrations → Transcription no dashboard do Recall.ai, o código também precisa pedir a transcrição em cada bot criado (`recording_config.transcript.provider.gladia_v2`, em `lib/recall.ts`) — só configurar o provedor no dashboard não liga a transcrição sozinho. `code_switching: true` fica ligado porque as aulas costumam misturar português e inglês na mesma fala.

### Desenvolvimento

```
npm install
npm run dev
```

### Deploy

Pronto para deploy na [Vercel](https://vercel.com/new). Checklist:

1. **Environment Variables**: adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para os ambientes Production e Preview. Se forem variáveis "Shared" (nível de time), confirme que estão **linkadas ao projeto** (Team Settings → Environment Variables → Shared → Link to Projects) — só existir no time não é suficiente. Sem isso o app retorna 500 em qualquer rota (o `proxy.ts` roda em toda requisição e precisa dessas variáveis).
2. **Framework Preset**: em Settings → Build and Deployment, garanta que está como **Next.js** (e sem "Output Directory" manual apontando para `public`) — o preset errado faz a build falhar com "No Output Directory named 'public' found".
