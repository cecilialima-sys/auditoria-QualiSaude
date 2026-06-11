import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { UserDirectory } from "@/components/users/UserDirectory";

export default function UsersPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Controle de acesso" title="Usuarios" />
      <UserDirectory />
    </AppShell>
  );
}
