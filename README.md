# QualiSaúde Hospitalar

Sistema web responsivo para auditoria hospitalar e qualidade assistencial.

## Funcionalidades

- Login demonstrativo e perfis de acesso.
- Dashboard com indicadores, alertas, rankings e gráficos.
- Setores hospitalares cadastrados com checklist inicial.
- Nova auditoria, checklist mobile-first e cálculo automático de conformidade.
- Relatório automático com conclusão inteligente.
- Exportação simulada em PDF e Excel por rotas de API.
- Planos de ação, usuários, permissões, configurações, perfil, logs e integração QualiSaúde.
- Backend organizado em camadas: domínio, aplicação e infraestrutura.
- Prisma schema e seed inicial para PostgreSQL.

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

Abra `http://localhost:3000`.

## Banco de dados opcional

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

O protótipo usa dados simulados no frontend para ficar executável imediatamente. A estrutura Prisma e os serviços estão prontos para trocar o armazenamento mockado por PostgreSQL.

## Login demonstrativo

- Email: `auditor@sisapec.local`
- Senha: qualquer valor
