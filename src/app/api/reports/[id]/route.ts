import { NextRequest, NextResponse } from "next/server";
import { deleteStoredAuditReport, findStoredAuditReport } from "@/backend/infrastructure/reports/auditReportStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "reports.export");
  if (auth.response) return auth.response;
  if (!auth.user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });

  const { id } = await context.params;
  const report = await findStoredAuditReport(id);
  if (!report) return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 });

  const canDelete = auth.user.role === "ADMIN" || report.auditorId === auth.user.id;
  if (!canDelete) {
    return NextResponse.json({ error: "Você não tem permissão para excluir este relatório." }, { status: 403 });
  }

  const deleted = await deleteStoredAuditReport(id);
  return NextResponse.json({
    ok: true,
    report: deleted
      ? {
          id: deleted.id,
          auditCode: deleted.auditCode
        }
      : null
  });
}
