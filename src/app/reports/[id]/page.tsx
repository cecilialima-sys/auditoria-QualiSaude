import Link from "next/link";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { findStoredAuditReport } from "@/backend/infrastructure/reports/auditReportStore";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportPreviewPage({ params }: PageProps) {
  const { id } = await params;
  const report = findStoredAuditReport(id);

  if (!report) {
    return (
      <AppShell>
        <PageHeader eyebrow="Relatório" title="Relatório não encontrado" />
        <section className="card empty-state">
          <h3>Não foi possível localizar o relatório.</h3>
          <p className="muted">Volte ao histórico de relatórios e tente abrir novamente.</p>
          <Link className="button" href="/reports">Voltar para relatórios</Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Preview"
        title={report.auditCode}
        action={<Link className="button secondary" href="/audits/checklist">Voltar para Auditoria</Link>}
      />
      <p className="muted" style={{ marginTop: -12, marginBottom: 16 }}>
        {report.sector} • {report.compliancePercentage}% de conformidade • {report.result}
      </p>

      <section className="card report-preview-toolbar" aria-label="Ações do relatório">
        <div>
          <strong>Relatório pronto para conferência</strong>
          <p className="muted">Confira o layout antes de baixar ou imprimir o PDF final.</p>
        </div>
        <div className="button-row">
          <a className="button secondary" href={`/api/reports/${id}/pdf`} target="_blank" rel="noreferrer">
            <Printer size={18} aria-hidden="true" />
            Gerar PDF
          </a>
          <a className="button" href={`/api/reports/${id}/pdf?download=1`}>
            <FileDown size={18} aria-hidden="true" />
            Baixar PDF
          </a>
          <Link className="button secondary" href="/audits/checklist">
            <ArrowLeft size={18} aria-hidden="true" />
            Voltar para Auditoria
          </Link>
        </div>
      </section>

      <section className="report-preview-frame card" aria-label="Preview HTML do relatório">
        <iframe title={`Preview do relatório ${report.auditCode}`} src={`/api/reports/${id}/html`} />
      </section>
    </AppShell>
  );
}
