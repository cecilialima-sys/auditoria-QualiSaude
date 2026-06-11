import { NextRequest, NextResponse } from "next/server";
import { readStoredAuditReportHtml } from "@/backend/infrastructure/reports/auditReportStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "reports.view");
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const stored = readStoredAuditReportHtml(id);
  if (!stored) return NextResponse.json({ error: "Relatório não encontrado ou sem HTML de preview." }, { status: 404 });

  return new NextResponse(stored.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex"
    }
  });
}
