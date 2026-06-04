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
