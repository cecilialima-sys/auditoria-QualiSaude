import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { sectors } from "@/lib/constants/audit-data";

export default function SectorsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Cadastro base"
        title="Setores hospitalares"
        action={<Link className="button" href="/audits/new">Auditar setor</Link>}
      />
      <div className="grid grid-3">
        {sectors.map((sector) => (
          <div className="card" key={sector}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <h3 style={{ marginTop: 0 }}>{sector}</h3>
              <span className="badge">Não auditado</span>
            </div>
            <div className="muted">Checklist base disponível para iniciar uma nova auditoria.</div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

