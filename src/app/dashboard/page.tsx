import Link from "next/link";
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList, Clock3, FileCheck2, ShieldAlert, Timer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { dashboardMetrics } from "@/lib/constants/audit-data";

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Visao geral"
        title="Dashboard de Auditoria Hospitalar"
        action={
          <Link className="button" href="/audits/new">
            <ClipboardList size={18} />
            Nova auditoria
          </Link>
        }
      />
      <div className="grid grid-4">
        <MetricCard title="Auditorias realizadas" value={dashboardMetrics.totalAudits} detail="Nenhuma auditoria registrada" icon={FileCheck2} />
        <MetricCard title="Pendentes" value={dashboardMetrics.pending} detail="Sem pendencias" icon={Clock3} />
        <MetricCard title="Em andamento" value={dashboardMetrics.inProgress} detail="Sem auditorias abertas" icon={Timer} />
        <MetricCard title="Concluidas" value={dashboardMetrics.completed} detail="Sem relatorios gerados" icon={CheckCircle2} />
        <MetricCard title="Conformidade geral" value={`${dashboardMetrics.compliance}%`} detail="Sem dados calculados" icon={BarChart3} />
        <MetricCard title="Nao conformidade" value={`${dashboardMetrics.nonCompliance}%`} detail="Sem dados calculados" icon={AlertTriangle} />
        <MetricCard title="Pendencias vencidas" value={dashboardMetrics.overdue} detail="Sem atrasos" icon={AlertTriangle} />
        <MetricCard title="Risco critico" value={dashboardMetrics.criticalRisk} detail="Sem alertas ativos" icon={ShieldAlert} />
      </div>
      <div style={{ height: 18 }} />
      <DashboardCharts />
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Alertas criticos</h3>
        <p className="muted">Nenhum alerta critico registrado.</p>
      </div>
    </AppShell>
  );
}
