"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

type ChecklistOption = {
  id: string;
  titulo: string;
  setor: string;
  totalPerguntas: number;
};

type User = {
  name: string;
  role: string;
};

type Props = {
  sectors: string[];
  auditTypes: string[];
  checklists: ChecklistOption[];
};

export function NewAuditForm({ sectors, auditTypes, checklists }: Props) {
  const router = useRouter();
  const [setor, setSetor] = useState("");
  const [responsavelSetor, setResponsavelSetor] = useState("");
  const [checklistId, setChecklistId] = useState("");
  const [tipoAuditoria, setTipoAuditoria] = useState("");
  const [observacoesIniciais, setObservacoesIniciais] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => undefined);
  }, []);

  async function startAudit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!setor) {
      setError("Informe o setor auditado.");
      return;
    }
    if (!responsavelSetor.trim()) {
      setError("Informe o responsável do setor.");
      return;
    }
    if (!checklistId) {
      setError("Selecione um checklist.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auditorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setor,
          responsavelSetor,
          checklistId,
          tipoAuditoria,
          observacoesIniciais
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível iniciar a auditoria.");

      setSuccess("Auditoria iniciada com sucesso.");
      router.push(`/audits/checklist?auditoriaId=${encodeURIComponent(data.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar a auditoria.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={startAudit}>
      <div className="grid grid-3">
        <div className="field">
          <label htmlFor="audit-sector">Setor auditado</label>
          <select className="input" id="audit-sector" value={setor} onChange={(event) => setSetor(event.target.value)}>
            <option value="" disabled>Selecione o setor</option>
            {sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="audit-responsible">Responsável pelo setor</label>
          <input
            className="input"
            id="audit-responsible"
            placeholder="Nome do responsável"
            value={responsavelSetor}
            onChange={(event) => setResponsavelSetor(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="audit-auditor">Auditor responsável</label>
          <input
            className="input"
            id="audit-auditor"
            readOnly
            value={user ? `${user.name} (${user.role})` : "Carregando usuário logado..."}
          />
        </div>
        <div className="field">
          <label htmlFor="audit-checklist">Checklist</label>
          <select className="input" id="audit-checklist" value={checklistId} onChange={(event) => setChecklistId(event.target.value)}>
            <option value="" disabled>Selecione o checklist</option>
            {checklists.map((checklist) => (
              <option key={checklist.id} value={checklist.id}>
                {checklist.titulo} ({checklist.totalPerguntas} itens)
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="audit-type">Tipo de auditoria</label>
          <select className="input" id="audit-type" value={tipoAuditoria} onChange={(event) => setTipoAuditoria(event.target.value)}>
            <option value="">Selecione o tipo</option>
            {auditTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="audit-date">Data de início</label>
          <input className="input" id="audit-date" readOnly value={new Date().toLocaleDateString("pt-BR")} />
        </div>
        <div className="field field-wide">
          <label htmlFor="audit-notes">Observações iniciais</label>
          <textarea
            className="input"
            id="audit-notes"
            placeholder="Auditoria de rotina no setor, contexto inicial ou observações relevantes."
            rows={4}
            value={observacoesIniciais}
            onChange={(event) => setObservacoesIniciais(event.target.value)}
          />
        </div>
      </div>

      {error ? <div className="badge danger" style={{ marginTop: 16 }}>{error}</div> : null}
      {success ? <div className="badge success" style={{ marginTop: 16 }}>{success}</div> : null}

      <div className="button-row" style={{ marginTop: 22 }}>
        <button className="button" disabled={loading} type="submit">
          <ClipboardCheck size={18} aria-hidden="true" />
          {loading ? "Iniciando auditoria..." : "Iniciar auditoria"}
        </button>
      </div>
    </form>
  );
}
