import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { auditTypes, categories, sectors } from "@/lib/constants/audit-data";

export default function NewAuditPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Nova auditoria" title="Planejamento da auditoria" />
      <div className="card">
        <div className="grid grid-3">
          <div className="field">
            <label>Setor auditado</label>
            <select className="input" defaultValue="">
              <option value="" disabled>Selecione o setor</option>
              {sectors.map((sector) => <option key={sector}>{sector}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Data da auditoria</label>
            <input className="input" type="date" />
          </div>
          <div className="field">
            <label>Auditor</label>
            <input className="input" placeholder="Nome do auditor" />
          </div>
          <div className="field">
            <label>Responsável pelo setor</label>
            <input className="input" placeholder="Nome do responsável" />
          </div>
          <div className="field">
            <label>Tipo de auditoria</label>
            <select className="input" defaultValue="">
              <option value="" disabled>Selecione o tipo</option>
              {auditTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Categoria inicial</label>
            <select className="input" defaultValue="">
              <option value="" disabled>Selecione a categoria</option>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          <Link className="button" href="/audits/checklist">
            <ClipboardCheck size={18} />
            Iniciar checklist
          </Link>
          <button className="button secondary">Agendar auditoria</button>
        </div>
      </div>
    </AppShell>
  );
}
