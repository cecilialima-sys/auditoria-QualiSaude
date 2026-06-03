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
        <MetricCard title="Auditorias realizadas" value={dashboardMetrics.totalAudits} detail="Nenhuma auditoria registrada" icon={FileCheck2} />
        <MetricCard title="Pendentes" value={dashboardMetrics.pending} detail="Sem pendências" icon={Clock3} />
        <MetricCard title="Em andamento" value={dashboardMetrics.inProgress} detail="Sem auditorias abertas" icon={Timer} />
        <MetricCard title="Concluídas" value={dashboardMetrics.completed} detail="Sem relatórios gerados" icon={CheckCircle2} />
        <MetricCard title="Conformidade geral" value={`${dashboardMetrics.compliance}%`} detail="Sem dados calculados" icon={BarChart3} />
        <MetricCard title="Não conformidade" value={`${dashboardMetrics.nonCompliance}%`} detail="Sem dados calculados" icon={AlertTriangle} />
        <MetricCard title="Pendências vencidas" value={dashboardMetrics.overdue} detail="Sem atrasos" icon={AlertTriangle} />
        <MetricCard title="Risco crítico" value={dashboardMetrics.criticalRisk} detail="Sem alertas ativos" icon={ShieldAlert} />
      </div>
      <div style={{ height: 18 }} />
      <DashboardCharts />
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Alertas críticos</h3>
        <p className="muted">Nenhum alerta crítico registrado.</p>
      </div>
    </AppShell>
  );
}

