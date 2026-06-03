# Estrutura front-end do QualiSaúde

O projeto usa Next.js com App Router, React e TypeScript. Por isso, as páginas não devem ser convertidas para arquivos `.html` estáticos: cada página principal fica em seu próprio arquivo `page.tsx`, que e o equivalente mantido pelo framework para rotas, autenticação, middleware, APIs e renderização.

## Mapa de páginas

- `/login`: `src/app/login/page.tsx`
- `/dashboard`: `src/app/dashboard/page.tsx`
- `/sectors`: `src/app/sectors/page.tsx`
- `/audits/new`: `src/app/audits/new/page.tsx`
- `/audits/checklist`: `src/app/audits/checklist/page.tsx`
- `/reports`: `src/app/reports/page.tsx`
- `/metrics`: `src/app/metrics/page.tsx`
- `/action-plans`: `src/app/action-plans/page.tsx`
- `/users`: `src/app/users/page.tsx`
- `/admin/access-control`: `src/app/admin/access-control/page.tsx`
- `/settings`: `src/app/settings/page.tsx`
- `/profile`: `src/app/profile/page.tsx`
- `/audit-logs`: `src/app/audit-logs/page.tsx`
- `/sisapec-integration`: `src/app/sisapec-integration/page.tsx`

## Organização

- Estrutura das páginas: `src/app/**/page.tsx`
- Componentes reutilizaveis: `src/components`
- Layout principal e navegação: `src/components/layout/AppShell.tsx`
- Rotas e menu centralizados: `src/lib/navigation/routes.ts`
- Dados futuros de checklists: `src/lib/checklists/checklist-template.ts`
- Estilos globais e responsividade: `src/app/globals.css`
- Logo do sistema: `public/qualisaude-logo.png`

## Como atualizar uma página

1. Abra o arquivo `page.tsx` da rota desejada.
2. Mantenha a página usando componentes reutilizaveis sempre que possivel.
3. Para adicionar item no menu, atualize `src/lib/navigation/routes.ts`.
4. Para adicionar perguntas de checklist, preencha `checklistTemplateGroups` em `src/lib/checklists/checklist-template.ts`.

## Checklists

A tela de checklist já está preparada para receber grupos por setor/categoria, perguntas, critério avaliado e texto explicativo. O ícone de informação ao lado de cada pergunta usa o campo `explanation`.

Foram importados 15 documentos `.docx` da pasta `Auditoria/Checklist ona`, totalizando 530 requisitos. Eles ficam cadastrados em `src/lib/checklists/checklist-template.ts`.

Cada item preserva:

- area/setor de origem;
- arquivo fonte;
- texto original do requisito;
- criterio `Manual ONA 2022 - requisito N`;
- explicação exibida no ícone informativo.

Quando novos checklists forem adicionados, mantenha a mesma estrutura de `ChecklistGroup` e `ChecklistQuestion`.

