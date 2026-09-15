import { NextRequest, NextResponse } from "next/server";
import { createTechnicalReport, generateTechnicalReportBatch, persistTechnicalReport } from "@/backend/application/reports/TechnicalAuditReportService";
import { findTechnicalAuditReportByAudit } from "@/backend/infrastructure/reports/technicalAuditReportStore";
import { getAuditWorkflowDetails } from "@/backend/infrastructure/audits/auditWorkflowStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

type Params = { params: Promise<{ id: string }> };
async function reportForAudit(id: string, user: NonNullable<Awaited<ReturnType<typeof requirePermission>>["user"]>) {
  const details = await getAuditWorkflowDetails(id, user!);
  if (!details) throw new Error("Auditoria não encontrada.");
  const existing = await findTechnicalAuditReportByAudit(id);
  if (existing) return existing.document;
  const document = createTechnicalReport({ auditId: id, checklist: details.checklist as any, audit: details.auditoria, responses: details.respostas });
  return persistTechnicalReport(document);
}
function view(document: Awaited<ReturnType<typeof reportForAudit>>) { return { id: document.id, auditId: document.auditId, auditCode: document.auditCode, status: document.status, completed: document.items.filter((item) => item.analysisAi).length, total: document.items.length, viewUrl: `/technical-reports/${document.id}`, downloadUrl: `/api/relatorios-tecnicos/${document.id}/pdf?download=1` }; }

export async function GET(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "reports.view"); if (auth.response) return auth.response;
  try { const { id } = await context.params; return NextResponse.json({ report: view(await reportForAudit(id, auth.user)) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível abrir o relatório técnico." }, { status: 400 }); }
}
export async function POST(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "records.edit"); if (auth.response) return auth.response;
  try {
    const { id } = await context.params; const payload = await request.json().catch(() => ({})); const document = await reportForAudit(id, auth.user);
    if (payload.action === "regenerate") {
      const item = document.items.find((candidate) => candidate.questionId === payload.questionId);
      if (!item) throw new Error("Item do relatório técnico não encontrado.");
      item.analysisAi = ""; item.analysisFinal = ""; item.normativeReferences = [];
      document.updatedAt = new Date().toISOString();
      return NextResponse.json({ report: view(await generateTechnicalReportBatch(document, 1)) });
    }
    if (payload.action === "generate") return NextResponse.json({ report: view(await generateTechnicalReportBatch(document, Number(payload.limit) || 2)) });
    return NextResponse.json({ report: view(document) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível gerar a análise técnica. Os dados foram preservados." }, { status: 503 }); }
}
export async function PATCH(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "records.edit"); if (auth.response) return auth.response;
  try {
    const { id } = await context.params; const payload = await request.json(); const document = await reportForAudit(id, auth.user);
    const item = document.items.find((candidate) => candidate.questionId === payload.questionId);
    if (!item) throw new Error("Item do relatório técnico não encontrado.");
    if (typeof payload.analysisFinal !== "string" || payload.analysisFinal.length > 12000) throw new Error("Texto final inválido.");
    item.analysisFinal = payload.analysisFinal.trim(); item.approvedAt = new Date().toISOString(); item.approvedBy = auth.user!.id;
    document.updatedAt = new Date().toISOString(); await persistTechnicalReport(document);
    return NextResponse.json({ ok: true, report: view(document) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a revisão." }, { status: 400 }); }
}
