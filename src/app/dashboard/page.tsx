import Link from "next/link";
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList, Clock3, FileCheck2, ShieldAlert, Timer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAuditDashboardMetrics } from "@/backend/infrastructure/audits/auditWorkflowStore";

export default async function DashboardPage() {
  const metrics = await getAuditDashboardMetrics();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard de Auditoria Hospitalar"
        action={
          <Link className="button" href="/audits/new">
            <ClipboardList size={18} />
            Nova auditoria
          </Link>
        }
      />
      <div className="grid grid-4">
        <MetricCard title="Auditorias realizadas" value={metrics.totalAudits} detail="Setores com auditoria iniciada" icon={FileCheck2} />
        <MetricCard title="Pendentes" value={metrics.pending} detail="Setores não iniciados" icon={Clock3} />
        <MetricCard title="Em andamento" value={metrics.inProgress} detail="Setores não finalizados" icon={Timer} tone={metrics.inProgress ? "warning" : "default"} />
        <MetricCard title="Concluídas" value={metrics.completed} detail="Setores auditados" icon={CheckCircle2} tone="success" />
        <MetricCard title="Conformidade geral" value={`${metrics.compliance}%`} detail="Calculada sobre itens aplicáveis" icon={BarChart3} />
        <MetricCard title="Não conformidade" value={`${metrics.nonCompliance}%`} detail="Calculada sobre itens aplicáveis" icon={AlertTriangle} tone={metrics.nonCompliance ? "warning" : "success"} />
        <MetricCard title="Pendências vencidas" value={metrics.overdue} detail="Sem controle de vencimento registrado" icon={AlertTriangle} />
        <MetricCard title="Risco crítico" value={metrics.criticalRisk} detail="Setores com resultado crítico" icon={ShieldAlert} tone={metrics.criticalRisk ? "danger" : "default"} />
      </div>
      <div style={{ height: 18 }} />
      <DashboardCharts />
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Alertas críticos</h3>
        <p className="muted">{metrics.criticalRisk ? `${metrics.criticalRisk} setor(es) com resultado crítico.` : "Nenhum alerta crítico registrado."}</p>
      </div>
    </AppShell>
  );
}
