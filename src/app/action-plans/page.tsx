import { ResourcePage } from "@/components/ui/ResourcePage";

const rows: Array<{ nc: string; setor: string; risco: string; responsável: string; prazo: string; status: string }> = [];

export default function ActionPlansPage() {
  return (
    <ResourcePage
      eyebrow="Correções e validação"
      title="Planos de ação"
      description="Os planos de ação serão criados a partir das não conformidades registradas nas auditorias."
      actionLabel="Criar plano"
      columns={[
        { key: "nc", label: "Não conformidade" },
        { key: "setor", label: "Setor" },
        { key: "risco", label: "Risco" },
        { key: "responsável", label: "Responsável" },
        { key: "prazo", label: "Prazo" },
        { key: "status", label: "Status" }
      ]}
      rows={rows}
    />
  );
}

