import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessControlManager } from "@/components/admin/AccessControlManager";

export default function AccessControlPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Area administrativa segura" title="Gerenciamento de Acessos" />
      <AccessControlManager />
    </AppShell>
  );
}
