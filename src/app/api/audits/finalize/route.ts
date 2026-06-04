import { NextRequest, NextResponse } from "next/server";
import { AuditReportPdfService } from "@/backend/application/reports/AuditReportPdfService";
import type { AuditReportInput } from "@/backend/application/reports/auditReportTypes";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

export async function POST(request: NextRequest) {
  const auth = requirePermission(request, "records.create");
  if (auth.response) return auth.response;
  if (!auth.user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });

  let input: AuditReportInput;
  try {
    input = (await request.json()) as AuditReportInput;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    const service = new AuditReportPdfService();
    const result = await service.finalizeAndGenerate(input, auth.user);

    return NextResponse.json({
      ok: true,
      report: {
        id: result.report.id,
        auditCode: result.report.auditCode,
        sector: result.report.sector,
        result: result.report.result,
        compliancePercentage: result.report.compliancePercentage,
        generatedAt: result.report.generatedAt,
        viewUrl: `/api/reports/${result.report.id}/pdf`,
        downloadUrl: `/api/reports/${result.report.id}/pdf?download=1`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar relatório." }, { status: 400 });
  }
}
