import { AppShell } from "@/components/layout/AppShell";
import { ChecklistRunner } from "@/components/audit/ChecklistRunner";
import { PageHeader } from "@/components/ui/PageHeader";

type ChecklistPageProps = {
  searchParams: Promise<{ auditoriaId?: string; auditId?: string }>;
};

export default async function ChecklistPage({ searchParams }: ChecklistPageProps) {
  const params = await searchParams;
  const auditId = params.auditoriaId ?? params.auditId;

  return (
    <AppShell>
      <PageHeader eyebrow="Auditoria em andamento" title="Checklist de auditoria hospitalar" />
      <ChecklistRunner auditId={auditId} />
    </AppShell>
  );
}
