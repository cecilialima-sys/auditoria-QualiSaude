import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { TechnicalReportReview } from "@/components/reports/TechnicalReportReview";
import { findTechnicalAuditReport } from "@/backend/infrastructure/reports/technicalAuditReportStore";
export default async function TechnicalReportPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const stored = await findTechnicalAuditReport(id); if (!stored) return <AppShell><PageHeader eyebrow="Relatório técnico" title="Relatório não encontrado"/><Link className="button" href="/reports">Voltar</Link></AppShell>; return <AppShell><PageHeader eyebrow="Revisão" title={stored.report.auditCode} action={<Link className="button secondary" href="/reports">Relatórios</Link>}/><TechnicalReportReview auditId={stored.report.auditId} reportId={id}/></AppShell>; }
