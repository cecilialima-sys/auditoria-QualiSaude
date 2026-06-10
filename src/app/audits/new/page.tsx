import { AppShell } from "@/components/layout/AppShell";
import { NewAuditForm } from "@/components/audit/NewAuditForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getChecklistCatalog } from "@/backend/infrastructure/audits/auditWorkflowStore";
import { auditTypes, sectors } from "@/lib/constants/audit-data";

export default function NewAuditPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Nova auditoria" title="Planejamento da auditoria" />
      <NewAuditForm sectors={sectors} auditTypes={auditTypes} checklists={getChecklistCatalog()} />
    </AppShell>
  );
}
