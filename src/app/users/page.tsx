import { ResourcePage } from "@/components/ui/ResourcePage";

const rows: Array<{ nome: string; email: string; perfil: string; setor: string; status: string }> = [];

export default function UsersPage() {
  return (
    <ResourcePage
      eyebrow="Controle de acesso"
      title="Usuários"
      description="Gerencie usuários reais pelo painel administrativo de acessos."
      columns={[
        { key: "nome", label: "Nome" },
        { key: "email", label: "E-mail" },
        { key: "perfil", label: "Perfil" },
        { key: "setor", label: "Setor" },
        { key: "status", label: "Status" }
      ]}
      rows={rows}
    />
  );
}

