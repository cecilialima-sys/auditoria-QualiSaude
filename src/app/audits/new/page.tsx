import { AppShell } from "@/components/layout/AppShell";
import { NewAuditForm } from "@/components/audit/NewAuditForm";
import { UnfinishedAuditsList } from "@/components/audit/UnfinishedAuditsList";
import { PageHeader } from "@/components/ui/PageHeader";
import { getChecklistCatalog } from "@/backend/infrastructure/audits/auditWorkflowStore";
import { auditTypes, sectors } from "@/lib/constants/audit-data";

export default function NewAuditPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Auditoria" title="Planejamento da auditoria" />
      <NewAuditForm sectors={sectors} auditTypes={auditTypes} checklists={getChecklistCatalog()} />
      <section id="auditorias-nao-finalizadas" style={{ marginTop: 24 }}>
        <PageHeader eyebrow="Auditorias salvas" title="Auditorias não finalizadas" />
        <UnfinishedAuditsList />
      </section>
    </AppShell>
  );
}
