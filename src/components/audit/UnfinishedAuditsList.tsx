"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, ClipboardList } from "lucide-react";

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
    return () => controller.abort();
  }, []);

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
          <Link className="button" href={`/audits/checklist?auditoriaId=${encodeURIComponent(audit.id)}`}>
            Continuar auditoria <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </article>
      ))}
    </section>
  );
}
