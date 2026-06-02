import { ResourcePage } from "@/components/ui/ResourcePage";

const rows: Array<{ arquivo: string; setor: string; tipo: string; tamanho: string; status: string }> = [];

export default function EvidencesPage() {
  return (
    <ResourcePage
      eyebrow="Upload seguro"
      title="Evidencias"
      description="Nenhum arquivo anexado."
      actionLabel="Anexar arquivo"
      columns={[
        { key: "arquivo", label: "Arquivo" },
        { key: "setor", label: "Setor" },
        { key: "tipo", label: "Tipo" },
        { key: "tamanho", label: "Tamanho" },
        { key: "status", label: "Status" }
      ]}
      rows={rows}
    />
  );
}
