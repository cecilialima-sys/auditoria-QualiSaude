import { AlertTriangle, BarChart3, CheckCircle2, Clock3 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAuditDashboardMetrics } from "@/backend/infrastructure/audits/auditWorkflowStore";

export default async function MetricsPage() {
  const metrics = await getAuditDashboardMetrics();

  return (
    <AppShell>
      <PageHeader eyebrow="Indicadores automáticos" title="Métricas e indicadores" />
      <div className="grid grid-4">
        <MetricCard title="NC abertas" value={metrics.openNonConformities} detail="Não conformidades dos setores auditados" icon={AlertTriangle} tone={metrics.openNonConformities ? "warning" : "success"} />
        <MetricCard title="NC resolvidas" value={metrics.resolvedNonConformities} detail="Resoluções registradas" icon={CheckCircle2} />
        <MetricCard title="Tempo médio" value={`${metrics.averageResolutionDays} dias`} detail="Tempo médio de resolução" icon={Clock3} />
        <MetricCard title="Concluídas" value={metrics.completed} detail="Setores marcados como auditados" icon={BarChart3} />
      </div>
      <div style={{ height: 16 }} />
      <DashboardCharts />
    </AppShell>
  );
}
