import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ReportsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Histórico"
        title="Relatórios"
        action={<Link className="button" href="/audits/new">Criar primeira auditoria</Link>}
      />
      <div className="card">
        <h3>Nenhum relatório gerado</h3>
        <p className="muted">
          Os relatórios aparecerão aqui depois que uma auditoria for finalizada.
        </p>
      </div>
    </AppShell>
  );
}

