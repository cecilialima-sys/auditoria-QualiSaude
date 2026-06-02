# QualiSaúde Hospitalar

Sistema web responsivo para auditoria hospitalar e qualidade assistencial.

## Funcionalidades

- Login demonstrativo e perfis de acesso.
- Dashboard com indicadores, alertas, rankings e graficos.
- Setores hospitalares cadastrados com checklist inicial.
- Nova auditoria, checklist mobile-first e calculo automatico de conformidade.
- Relatorio automatico com conclusao inteligente.
- Exportacao simulada em PDF e Excel por rotas de API.
- Planos de acao, usuarios, permissoes, configuracoes, perfil, logs e integracao QualiSaude.
- Backend organizado em camadas: dominio, aplicacao e infraestrutura.
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

O prototipo usa dados simulados no frontend para ficar executavel imediatamente. A estrutura Prisma e os servicos estao prontos para trocar o armazenamento mockado por PostgreSQL.

## Login demonstrativo

- Email: `auditor@sisapec.local`
- Senha: qualquer valor
