import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { listChecklistAuditStatuses } from "@/backend/infrastructure/audits/auditWorkflowStore";

function badgeClass(status: string) {
  if (status === "auditado") return "success";
  if (status === "nao_finalizado") return "warning";
  return "";
}

function formatDate(value?: string) {
  if (!value) return "Sem registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default async function SectorsPage() {
  const checklistStatuses = await listChecklistAuditStatuses();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Cadastro base"
        title="Setores hospitalares"
        action={<Link className="button" href="/audits/new">Auditar setor</Link>}
      />
      <div className="grid grid-3">
        {checklistStatuses.map((item) => (
          <div className="card" key={item.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <h3 style={{ marginTop: 0 }}>{item.unidade} - {item.setor}</h3>
              <span className={`badge ${badgeClass(item.status)}`}>{item.statusLabel}</span>
            </div>
            <div className="muted">Checklist: {item.titulo}</div>
            <div className="muted">Total de itens: {item.totalPerguntas}</div>
            {item.metrics ? (
              <div style={{ marginTop: 12 }}>
                <div>Conformidade: <strong>{item.metrics.compliancePercentage}%</strong></div>
                <div>Não conformidades: <strong>{item.metrics.nonConformingItems}</strong></div>
                <div>Última atualização: <strong>{formatDate(item.atualizadoEm)}</strong></div>
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 12 }}>Checklist base disponível para iniciar uma nova auditoria.</div>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
