import { AppShell } from "@/components/layout/AppShell";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ChangePasswordPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Seguranca" title="Troca obrigatoria de senha" />
      <ChangePasswordForm />
    </AppShell>
  );
}
