import { NextRequest, NextResponse } from "next/server";
import { getStoredAuditReports, readStoredAuditReportDocument } from "@/backend/infrastructure/reports/auditReportStore";
import { findTechnicalAuditReportByAudit } from "@/backend/infrastructure/reports/technicalAuditReportStore";
import { resolveAuditIdForStoredReport } from "@/backend/infrastructure/audits/auditWorkflowStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "reports.view");
  if (auth.response) return auth.response;
  const reports = await getStoredAuditReports() ?? [];

  const items = await Promise.all(reports.map(async (report) => {
    const base = {
      id: report.id,
      auditCode: report.auditCode,
      sector: report.sector,
      auditType: report.auditType,
      auditorName: report.auditorName,
      compliancePercentage: report.compliancePercentage,
      result: report.result,
      generatedAt: report.generatedAt,
      viewUrl: `/reports/${report.id}`,
      downloadUrl: `/api/reports/${report.id}/pdf?download=1`
    };

    try {
      const stored = await readStoredAuditReportDocument(report.id);
      const auditId = stored?.document.auditId ?? await resolveAuditIdForStoredReport({
        checklistId: report.checklistId,
        auditorId: report.auditorId,
        auditType: report.auditType,
        sector: report.sector
      });
      const technical = auditId ? await findTechnicalAuditReportByAudit(auditId) : null;
      return {
        ...base,
        technicalAuditId: auditId,
        technicalUrl: technical ? `/technical-reports/${technical.report.id}` : undefined
      };
    } catch (error) {
      // A disponibilidade do novo relatório técnico não pode impedir que os
      // relatórios originais continuem visíveis, inclusive antes da migration.
      console.warn("[reports] Technical report lookup skipped", {
        reportId: report.id,
        message: error instanceof Error ? error.message : String(error)
      });
      return base;
    }
  }));
  return NextResponse.json({
    reports: items
  });
}
