import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Seguranca do ADMIN" title="Troca obrigatoria de senha" />
      <ChangePasswordForm />
    </AppShell>
  );
}
