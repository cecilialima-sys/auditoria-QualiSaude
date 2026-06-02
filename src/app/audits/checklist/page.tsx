import { AppShell } from "@/components/layout/AppShell";
import { ChecklistRunner } from "@/components/audit/ChecklistRunner";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ChecklistPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Auditoria em andamento" title="Checklist de auditoria hospitalar" />
      <ChecklistRunner />
    </AppShell>
  );
}
