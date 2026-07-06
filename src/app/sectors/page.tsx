import Link from "next/link";
import { Eye } from "lucide-react";
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`badge ${badgeClass(item.status)}`}>{item.statusLabel}</span>
                {item.status === "auditado" ? (
                  item.reportUrl ? (
                    <Link
                      aria-label={`Ver relatório de ${item.unidade} - ${item.setor}`}
                      className="button secondary"
                      href={item.reportUrl}
                      style={{ minHeight: 34, padding: "7px 10px" }}
                      title="Ver relatório"
                    >
                      <Eye size={16} aria-hidden="true" />
                    </Link>
                  ) : (
                    <span
                      aria-label={`Relatório indisponível para ${item.unidade} - ${item.setor}`}
                      className="button secondary"
                      style={{ minHeight: 34, opacity: 0.45, padding: "7px 10px", pointerEvents: "none" }}
                      title="Relatório indisponível"
                    >
                      <Eye size={16} aria-hidden="true" />
                    </span>
                  )
                ) : null}
              </div>
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
