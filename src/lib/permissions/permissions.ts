export const permissionCatalog = [
  { key: "dashboard.view", label: "Acessar dashboard geral", module: "Dashboard" },
  { key: "reports.view", label: "Acessar relatórios", module: "Relatórios" },
  { key: "metrics.view", label: "Acessar métricas", module: "Métricas" },
  { key: "checklists.view", label: "Acessar checklists de auditoria", module: "Checklists" },
  { key: "sectors.view", label: "Acessar setores hospitalares", module: "Setores" },
  { key: "records.create", label: "Criar novos registros", module: "Registros" },
  { key: "records.edit", label: "Editar registros", module: "Registros" },
  { key: "records.delete", label: "Excluir registros", module: "Registros" },
  { key: "reports.export", label: "Exportar PDF ou Excel", module: "Exportação" },
  { key: "sensitive.view", label: "Visualizar dados sensíveis", module: "Segurança" },
  { key: "users.manage", label: "Gerenciar usuários", module: "Administração" },
  { key: "settings.manage", label: "Alterar configurações do sistema", module: "Administração" },
  { key: "permissions.manage", label: "Gerenciar permissões", module: "Administração" },
  { key: "audit_logs.view", label: "Visualizar logs de auditoria", module: "Auditoria" }
] as const;

export type PermissionKey = (typeof permissionCatalog)[number]["key"];

export const allPermissionKeys = permissionCatalog.map((permission) => permission.key);

export const roleLabels = {
  ADMIN: "ADMIN",
  COORDENADOR: "COORDENADOR",
  AUDITOR: "AUDITOR",
  ENFERMEIRO: "ENFERMEIRO",
  VISUALIZADOR: "VISUALIZADOR",
  USUARIO_COMUM: "USUÁRIO COMUM"
} as const;

export const rolePermissionDefaults: Record<keyof typeof roleLabels, string[]> = {
  ADMIN: allPermissionKeys,
  COORDENADOR: [
    "dashboard.view",
    "reports.view",
    "metrics.view",
    "checklists.view",
    "sectors.view",
    "records.create",
    "records.edit",
    "reports.export",
    "sensitive.view"
  ],
  AUDITOR: [
    "dashboard.view",
    "reports.view",
    "checklists.view",
    "sectors.view",
    "records.create",
    "records.edit",
    "reports.export"
  ],
  ENFERMEIRO: ["dashboard.view", "checklists.view", "sectors.view", "records.create"],
  VISUALIZADOR: ["dashboard.view", "reports.view", "metrics.view"],
  USUARIO_COMUM: ["dashboard.view"]
};

export function hasPermission(userPermissions: string[] = [], permission: string) {
  return userPermissions.includes(permission) || userPermissions.includes("*");
}
