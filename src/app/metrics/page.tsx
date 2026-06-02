import { AlertTriangle, BarChart3, CheckCircle2, Clock3 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { dashboardMetrics } from "@/lib/constants/audit-data";

export default function MetricsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Indicadores automaticos" title="Metricas e indicadores" />
      <div className="grid grid-4">
        <MetricCard title="NC abertas" value={dashboardMetrics.openNonConformities} detail="Nenhuma nao conformidade" icon={AlertTriangle} />
        <MetricCard title="NC resolvidas" value={dashboardMetrics.resolvedNonConformities} detail="Nenhuma resolucao registrada" icon={CheckCircle2} />
        <MetricCard title="Tempo medio" value={`${dashboardMetrics.averageResolutionDays} dias`} detail="Sem dados" icon={Clock3} />
        <MetricCard title="Concluidas no prazo" value="0%" detail="Sem auditorias concluidas" icon={BarChart3} />
      </div>
      <div style={{ height: 16 }} />
      <DashboardCharts />
    </AppShell>
  );
}
