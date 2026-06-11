import { NextRequest, NextResponse } from "next/server";
import { readStoredAuditReportPdf } from "@/backend/infrastructure/reports/auditReportStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "reports.view");
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const stored = readStoredAuditReportPdf(id);
  if (!stored) return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 });

  const download = request.nextUrl.searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(stored.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename=${stored.report.auditCode}.pdf`,
      "X-Report-Hash": stored.report.hash
    }
  });
}
