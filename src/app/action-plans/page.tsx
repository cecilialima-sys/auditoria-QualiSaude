import { ResourcePage } from "@/components/ui/ResourcePage";

const rows: Array<{ nc: string; setor: string; risco: string; responsavel: string; prazo: string; status: string }> = [];

export default function ActionPlansPage() {
  return (
    <ResourcePage
      eyebrow="Correcoes e validacao"
      title="Planos de acao"
      description="Os planos de acao serao criados a partir das nao conformidades registradas nas auditorias."
      actionLabel="Criar plano"
      columns={[
        { key: "nc", label: "Nao conformidade" },
        { key: "setor", label: "Setor" },
        { key: "risco", label: "Risco" },
        { key: "responsavel", label: "Responsavel" },
        { key: "prazo", label: "Prazo" },
        { key: "status", label: "Status" }
      ]}
      rows={rows}
    />
  );
}
