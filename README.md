# QualiSaúde Hospitalar

Sistema web responsivo para auditoria hospitalar, checklists, relatórios PDF, métricas, permissões e uso mobile offline.

## Tecnologia Identificada

- Next.js com App Router
- React e TypeScript
- Backend por rotas API do Next.js
- Prisma ORM
- PostgreSQL local via `DATABASE_URL`
- Puppeteer para geração de PDF

## PostgreSQL Local

O projeto já usa Prisma com PostgreSQL em [prisma/schema.prisma](prisma/schema.prisma). A conexão é lida somente por variável de ambiente:

```env
DATABASE_URL="postgresql://qualisaude_user:sua_senha_segura@localhost:5432/qualisaude_auditoria"
```

Não coloque senha no código. Configure a senha real apenas no arquivo `.env`, que está no `.gitignore`.

Neste computador, o serviço detectado foi:

```txt
postgresql-x64-18
```

O script também detecta automaticamente outros serviços com nome contendo `postgres`. Se necessário, force o nome no `.env`:

```env
POSTGRES_SERVICE_NAME="postgresql-x64-18"
```

## Configuração Inicial

1. Instale dependências:

```bash
npm install
```

2. Copie o exemplo de ambiente:

```bash
copy .env.example .env
```

3. Ajuste `DATABASE_URL` no `.env` com o usuário, senha e banco reais do PostgreSQL local.

4. Gere o Prisma Client:

```bash
npm run prisma:generate
```

5. Crie o banco, se ainda não existir:

```bash
npm run db:setup
```

Se o usuário do `DATABASE_URL` não tiver permissão para criar banco, crie manualmente no PostgreSQL com um usuário administrador:

```sql
CREATE USER qualisaude_user WITH PASSWORD 'sua_senha_segura';
CREATE DATABASE qualisaude_auditoria OWNER qualisaude_user;
```

6. Rode migrations:

```bash
npm run prisma:migrate
```

7. Rode seed inicial:

```bash
npm run prisma:seed
```

## Comando Único Para Rodar

No Windows:

```bash
npm run dev
```

Esse comando executa:

1. `scripts/start-postgres-windows.ps1`
2. `scripts/check-db.js`
3. `next dev --webpack --port 3003`

O sistema só sobe se o PostgreSQL estiver rodando e a conexão do banco funcionar.

Abra:

```txt
http://localhost:3003/login
```

## Scripts De Banco

```bash
npm run db:start
npm run db:check
npm run db:setup
npm run prisma:migrate
npm run prisma:seed
```

Scripts criados:

- [scripts/start-postgres-windows.ps1](scripts/start-postgres-windows.ps1): detecta e inicia o serviço PostgreSQL no Windows.
- [scripts/start-postgres-linux.sh](scripts/start-postgres-linux.sh): inicia PostgreSQL via `systemctl`/`service`.
- [scripts/start-postgres-macos.sh](scripts/start-postgres-macos.sh): inicia PostgreSQL via Homebrew.
- [scripts/check-db.js](scripts/check-db.js): valida conexão real com Prisma, sem expor senha.
- [scripts/setup-db.js](scripts/setup-db.js): tenta criar o banco com `createdb`, se o usuário tiver permissão.
- [scripts/start-dev.ps1](scripts/start-dev.ps1): sobe PostgreSQL, valida banco e inicia o sistema.

## Migrations

A migration inicial está em:

```txt
prisma/migrations/20260604120000_init_postgresql/migration.sql
```

Ela cria as tabelas principais:

- `users`
- `roles`
- `permissions`
- `role_permissions`
- `user_permissions`
- `sectors`
- `checklists`
- `checklist_items`
- `audits`
- `audit_responses`
- `non_conformities`
- `action_plans`
- `evidences`
- `reports`
- `metrics`
- `notifications`
- `audit_logs`

## Erros Comuns

Serviço PostgreSQL parado:

```bash
npm run db:start
```

Senha incorreta:

```txt
Usuário ou senha do PostgreSQL incorretos.
```

Corrija a senha no `.env`.

Banco inexistente:

```txt
Banco de dados inexistente.
```

Rode:

```bash
npm run db:setup
```

ou crie manualmente no PostgreSQL.

Porta errada:

Verifique se a `DATABASE_URL` usa a porta correta, normalmente `5432`.

## Segurança

- `.env` não deve ser versionado.
- `.env.example` não contém senha real.
- A senha do PostgreSQL não é impressa nos logs.
- O sistema valida o banco antes de iniciar.
- O serviço PostgreSQL é iniciado localmente, sem expor novas portas públicas.
- Para produção, use usuário próprio com permissões mínimas e senhas fortes.

## Login ADMIN Inicial

Configure no `.env`:

```env
ADMIN_EMAIL="cecilia.lima@sou.unifal-mg.edu.br"
ADMIN_PASSWORD="senha_inicial_segura"
```

A senha é criptografada no seed/camada de autenticação. Não use senha real no `.env.example`.

## Usuario De Desenvolvedor

O seed pode garantir um usuario de desenvolvedor para testar, auditar e validar auditorias, permissoes e integracao QualiSaude/SISAPEC.

Em desenvolvimento, configure no `.env` se quiser sobrescrever os padroes:

```env
SEED_DEVELOPER_USER="true"
DEV_USER_NAME="Desenvolvedor QualiSaude"
DEV_USER_EMAIL="cecilia.lima@sou.unifal-mg.edu.br"
# DEV_USER_PASSWORD="senha_inicial_segura"
```

Se `DEV_USER_PASSWORD` nao for informado fora de producao, o seed gera uma senha forte e imprime no terminal apenas quando criar o usuario pela primeira vez. O usuario deve trocar a senha no primeiro login.

Em producao, nao ha senha fixa no codigo: defina `DEV_USER_EMAIL` e `DEV_USER_PASSWORD` no painel do provedor quando esse acesso for realmente necessario, ou mantenha `SEED_DEVELOPER_USER="false"`.

## Deploy Em Produção: Render + Supabase

### Estratégia

Este projeto é um aplicativo Next.js fullstack. No Render, use um único **Web Service** na raiz do repositório:

- Frontend: páginas Next.js em `src/app`
- Backend/API: rotas em `src/app/api`
- Arquivos públicos/PWA/mobile: `public/mobile`
- Prisma/migrations: `prisma`
- PDF: serviço backend com Puppeteer

O banco de produção deve ser PostgreSQL do Supabase, configurado por variável de ambiente no Render.

### Supabase

1. Crie um projeto no Supabase.
2. Copie a connection string PostgreSQL.
3. No Render, configure `DATABASE_URL` com SSL:

```env
DATABASE_URL="postgresql://usuario:senha@host.supabase.co:5432/postgres?sslmode=require"
SUPABASE_URL="https://muznilpevhyhmyyjenvv.supabase.co"
NEXT_PUBLIC_SUPABASE_URL="https://muznilpevhyhmyyjenvv.supabase.co"
```

Não coloque essa URL no código e não envie `.env` ao GitHub.

### Render

Este repositório possui [render.yaml](render.yaml) para Blueprint. Também é possível configurar manualmente:

- Service type: `Web Service`
- Root directory: vazio, raiz do repositório
- Branch: `main`
- Build command:

```bash
npm ci && npx prisma generate && npm run build
```

- Pre-deploy command:

```bash
npx prisma migrate deploy
```

- Start command:

```bash
npm start
```

O `npm start` executa [scripts/start-production.js](scripts/start-production.js), que usa `process.env.PORT` fornecido pelo Render.

### Variáveis De Ambiente No Render

Configure no painel do Render:

```env
NODE_ENV=production
DATABASE_URL=postgresql://usuario:senha@host.supabase.co:5432/postgres?sslmode=require
SUPABASE_URL=https://muznilpevhyhmyyjenvv.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://muznilpevhyhmyyjenvv.supabase.co
JWT_SECRET=uma_chave_forte
JWT_REFRESH_SECRET=outra_chave_forte
ADMIN_EMAIL=cecilia.lima@sou.unifal-mg.edu.br
ADMIN_PASSWORD=senha_inicial_segura
APP_URL=https://seu-servico.onrender.com
NEXT_PUBLIC_APP_URL=https://seu-servico.onrender.com
MAX_UPLOAD_MB=10
REPORTS_DIR=/opt/render/project/src/data/reports
AUDIT_REPORT_STORE_PATH=/opt/render/project/src/data/audit-report-store.json
```

Use [.env.production.example](.env.production.example) apenas como modelo, sem credenciais reais.

### Migrations Em Produção

Não use `migrate dev` em produção. Use:

```bash
npx prisma migrate deploy
```

O Render executa isso como `preDeployCommand` no Blueprint.

### Health Check

O endpoint de saúde é:

```txt
/api/health
```

Ele testa conexão real com PostgreSQL via Prisma e retorna `503` se o banco estiver indisponível.

### PDF Em Produção

Os relatórios são gerados no backend com Puppeteer. Atenção: armazenamento local no Render pode não ser permanente no plano gratuito. Para produção real, prefira:

- Render Persistent Disk; ou
- Supabase Storage; ou
- gerar PDF sob demanda a partir dos dados salvos no banco.

Os caminhos `REPORTS_DIR` e `AUDIT_REPORT_STORE_PATH` foram deixados configuráveis por ambiente.

### Mobile/Offline Em Produção

A versão mobile está em:

```txt
/mobile/checklists.html
```

O Service Worker fica limitado ao escopo:

```txt
/mobile/
```

Em produção, ele funciona por HTTPS no Render. A sincronização offline usa APIs relativas (`/api/...`), então aponta automaticamente para o mesmo domínio do Render.

### Testes Após Deploy

1. Abrir a URL do Render.
2. Acessar `/api/health`.
3. Testar login.
4. Rodar seed/migrations se necessário.
5. Preencher checklist.
6. Finalizar auditoria.
7. Gerar e baixar PDF.
8. Abrir `/mobile/checklists.html`.
9. Testar modo offline.
10. Sincronizar checklist offline e verificar dados no Supabase.

### Pontos De Atenção

- O app ainda possui alguns stores locais para protótipo/histórico, como relatórios e sincronização offline. Em produção definitiva, migrar esses registros para tabelas Prisma/Supabase.
- O plano gratuito do Render pode hibernar o serviço e não garante persistência local.
- Nunca configure `JWT_SECRET`, `ADMIN_PASSWORD` ou `DATABASE_URL` no frontend.
