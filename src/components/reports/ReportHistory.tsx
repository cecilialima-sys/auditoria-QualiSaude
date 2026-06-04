"use client";

import { useEffect, useState } from "react";
import { Eye, FileDown } from "lucide-react";

type ReportListItem = {
  id: string;
  auditCode: string;
  sector: string;
  auditType: string;
  auditorName: string;
  compliancePercentage: number;
  result: string;
  generatedAt: string;
  viewUrl: string;
  downloadUrl: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function ReportHistory() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/reports")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar relatórios.");
        setReports(data.reports ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar relatórios."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card">
        <h3>Carregando relatórios</h3>
        <p className="muted">Buscando histórico salvo no servidor.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>Não foi possível carregar os relatórios</h3>
        <p className="muted">{error}</p>
      </div>
    );
  }

  if (!reports.length) {
    return (
      <div className="card">
        <h3>Nenhum relatório gerado</h3>
        <p className="muted">Os relatórios aparecerão aqui depois que uma auditoria for finalizada.</p>
      </div>
    );
  }

  return (
    <div className="grid">
      {reports.map((report) => (
        <article className="card" key={report.id}>
          <div className="grid grid-3">
            <div>
              <span className="badge">{report.result}</span>
              <h3 style={{ marginTop: 8 }}>{report.auditCode}</h3>
              <p className="muted">{report.sector}</p>
            </div>
            <div>
              <strong>{report.compliancePercentage}% de conformidade</strong>
              <p className="muted">{report.auditType}</p>
            </div>
            <div>
              <strong>{report.auditorName}</strong>
              <p className="muted">{formatDate(report.generatedAt)}</p>
            </div>
          </div>
          <div className="button-row">
            <a className="button secondary" href={report.viewUrl} target="_blank" rel="noreferrer">
              <Eye size={18} aria-hidden="true" />
              Ver relatório
            </a>
            <a className="button secondary" href={report.downloadUrl}>
              <FileDown size={18} aria-hidden="true" />
              Baixar PDF
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
