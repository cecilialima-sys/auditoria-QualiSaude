"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, ClipboardList, Trash2 } from "lucide-react";

type UnfinishedAudit = {
  id: string;
  setor: string;
  responsavelSetor: string;
  checklistTitulo: string;
  auditorNome: string;
  status: "rascunho" | "em_andamento" | "sincronizacao_pendente";
  createdAt: string;
  updatedAt: string;
};

type CurrentUser = {
  permissions?: string[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: UnfinishedAudit["status"]) {
  if (status === "sincronizacao_pendente") return "Sincronização pendente";
  if (status === "rascunho") return "Não finalizada";
  return "Em andamento";
}

export function UnfinishedAuditsList() {
  const [audits, setAudits] = useState<UnfinishedAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auditorias/nao-finalizadas", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar as auditorias.");
        setAudits(data.auditorias ?? []);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Erro ao carregar auditorias.");
      })
      .finally(() => setLoading(false));

    fetch("/api/auth/me", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data: { user?: CurrentUser } | null) => {
        setCanDelete(Boolean(data?.user?.permissions?.includes("records.delete")));
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  async function deleteAudit(audit: UnfinishedAudit) {
    const confirmed = window.confirm(`Excluir a auditoria não finalizada do setor "${audit.setor}"? Esta ação removerá a auditoria da lista.`);
    if (!confirmed) return;

    setError("");
    setDeletingId(audit.id);
    try {
      const response = await fetch(`/api/auditorias/${encodeURIComponent(audit.id)}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível excluir a auditoria.");
      setAudits((current) => current.filter((item) => item.id !== audit.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a auditoria.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <section className="card empty-state"><h3>Carregando auditorias</h3><p className="muted">Buscando auditorias salvas no servidor.</p></section>;
  }

  if (error) {
    return <section className="card empty-state"><h3>Não foi possível carregar as auditorias</h3><p className="muted">{error}</p></section>;
  }

  if (!audits.length) {
    return (
      <section className="card empty-state">
        <ClipboardList size={32} aria-hidden="true" />
        <h3>Nenhuma auditoria em andamento encontrada.</h3>
        <p className="muted">Ao salvar uma auditoria sem finalizá-la, ela aparecerá aqui.</p>
        <Link className="button" href="/audits/new">Iniciar nova auditoria</Link>
      </section>
    );
  }

  return (
    <section className="unfinished-audit-grid" aria-label="Auditorias não finalizadas">
      {audits.map((audit) => (
        <article className="card unfinished-audit-card" key={audit.id}>
          <div className="unfinished-audit-heading">
            <div>
              <span className="badge warning">{statusLabel(audit.status)}</span>
              <h2>{audit.setor}</h2>
            </div>
            <CalendarClock size={22} aria-hidden="true" />
          </div>
          <dl className="unfinished-audit-details">
            <div><dt>Responsável pelo setor</dt><dd>{audit.responsavelSetor}</dd></div>
            <div><dt>Checklist</dt><dd>{audit.checklistTitulo}</dd></div>
            <div><dt>Auditor</dt><dd>{audit.auditorNome}</dd></div>
            <div><dt>Última atualização</dt><dd>{formatDate(audit.updatedAt || audit.createdAt)}</dd></div>
          </dl>
          <div className="button-row">
            <Link className="button" href={`/audits/checklist?auditoriaId=${encodeURIComponent(audit.id)}`}>
              Continuar auditoria <ArrowRight size={18} aria-hidden="true" />
            </Link>
            {canDelete ? (
              <button
                aria-label={`Excluir auditoria não finalizada do setor ${audit.setor}`}
                className="button secondary"
                disabled={deletingId === audit.id}
                onClick={() => deleteAudit(audit)}
                type="button"
              >
                <Trash2 size={18} aria-hidden="true" />
                {deletingId === audit.id ? "Excluindo..." : "Excluir"}
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
