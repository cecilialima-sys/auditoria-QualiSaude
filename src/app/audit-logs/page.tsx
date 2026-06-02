import { ResourcePage } from "@/components/ui/ResourcePage";

const rows: Array<{ data: string; usuario: string; acao: string; entidade: string; ip: string }> = [];

export default function AuditLogsPage() {
  return (
    <ResourcePage
      eyebrow="Rastreabilidade"
      title="Logs de auditoria"
      description="Os logs serao registrados automaticamente conforme o sistema for utilizado."
      columns={[
        { key: "data", label: "Data" },
        { key: "usuario", label: "Usuario" },
        { key: "acao", label: "Acao" },
        { key: "entidade", label: "Entidade" },
        { key: "ip", label: "IP" }
      ]}
      rows={rows}
    />
  );
}
