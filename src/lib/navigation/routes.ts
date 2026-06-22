import {
  BarChart3,
  ClipboardCheck,
  FileText,
  Home,
  Hospital,
  KeyRound,
  Settings,
  ShieldCheck,
  Smartphone,
  UserCircle,
  Users,
  type LucideIcon
} from "lucide-react";

export type AppRoute = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: string;
};

export const appRoutes: AppRoute[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, permission: "dashboard.view" },
  { href: "/sectors", label: "Setores", icon: Hospital, permission: "sectors.view" },
  { href: "/audits/new", label: "Auditoria", icon: ClipboardCheck, permission: "records.create" },
  { href: "/mobile/checklists.html", label: "Mobile offline", icon: Smartphone, permission: "checklists.view" },
  { href: "/reports", label: "Relatórios", icon: FileText, permission: "reports.view" },
  { href: "/metrics", label: "Métricas", icon: BarChart3, permission: "metrics.view" },
  { href: "/action-plans", label: "Planos de ação", icon: ShieldCheck, permission: "records.edit" },
  { href: "/users", label: "Usuários", icon: Users, permission: "users.manage" },
  { href: "/admin/access-control", label: "Gerenciamento de Acessos", icon: KeyRound, permission: "permissions.manage" },
  { href: "/settings", label: "Configurações", icon: Settings, permission: "settings.manage" },
  { href: "/profile", label: "Perfil", icon: UserCircle, permission: "dashboard.view" },
  { href: "/audit-logs", label: "Logs", icon: FileText, permission: "audit_logs.view" }
];

export const mainFallbackRoutes = ["/dashboard", "/profile"];

