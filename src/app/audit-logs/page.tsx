import { ResourcePage } from "@/components/ui/ResourcePage";

const rows: Array<{ data: string; usuario: string; ação: string; entidade: string; ip: string }> = [];

export default function AuditLogsPage() {
  return (
    <ResourcePage
      eyebrow="Rastreabilidade"
      title="Logs de auditoria"
      description="Os logs serão registrados automáticamente conforme o sistema for utilizado."
      columns={[
        { key: "data", label: "Data" },
        { key: "usuario", label: "Usuario" },
        { key: "ação", label: "Ação" },
        { key: "entidade", label: "Entidade" },
        { key: "ip", label: "IP" }
      ]}
      rows={rows}
    />
  );
}

