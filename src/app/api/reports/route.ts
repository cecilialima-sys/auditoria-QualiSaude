import { NextRequest, NextResponse } from "next/server";
import { getStoredAuditReports } from "@/backend/infrastructure/reports/auditReportStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

export async function GET(request: NextRequest) {
  const auth = requirePermission(request, "reports.view");
  if (auth.response) return auth.response;

  return NextResponse.json({
    reports: getStoredAuditReports().map((report) => ({
      id: report.id,
      auditCode: report.auditCode,
      sector: report.sector,
      auditType: report.auditType,
      auditorName: report.auditorName,
      compliancePercentage: report.compliancePercentage,
      result: report.result,
      generatedAt: report.generatedAt,
      viewUrl: `/api/reports/${report.id}/pdf`,
      downloadUrl: `/api/reports/${report.id}/pdf?download=1`
    }))
  });
}
