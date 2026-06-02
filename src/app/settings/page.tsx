import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Administração" title="Configurações" />
      <div className="grid grid-2">
        {[
          ["Segurança", "JWT, refresh token, rate limiting, CSRF, XSS, sanitização e logs de auditoria."],
          ["Upload", "Tipos permitidos: JPG, PNG, PDF, XLSX. Tamanho máximo controlado por variável de ambiente."],
          ["Backup", "Rotina prevista para backup PostgreSQL e retenção de evidências."],
          ["Notificações", "Alertas para auditorias pendentes, relatório disponível, plano vencido e risco crítico."]
        ].map(([title, text]) => (
          <div className="card" key={title}>
            <h3>{title}</h3>
            <p className="muted">{text}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
