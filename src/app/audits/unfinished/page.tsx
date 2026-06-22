import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { UnfinishedAuditsList } from "@/components/audit/UnfinishedAuditsList";
import { PageHeader } from "@/components/ui/PageHeader";

export default function UnfinishedAuditsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Auditorias salvas"
        title="Auditorias não finalizadas"
        action={<Link className="button" href="/audits/new">Nova auditoria</Link>}
      />
      <UnfinishedAuditsList />
    </AppShell>
  );
}
