import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportHistory } from "@/components/reports/ReportHistory";

export default function ReportsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Histórico"
        title="Relatórios"
        action={<Link className="button" href="/audits/new">Criar primeira auditoria</Link>}
      />
      <ReportHistory />
    </AppShell>
  );
}
