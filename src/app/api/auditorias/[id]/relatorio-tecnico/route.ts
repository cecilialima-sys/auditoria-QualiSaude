import { NextRequest, NextResponse } from "next/server";
import { createTechnicalReport, generateTechnicalReportBatch, persistTechnicalReport } from "@/backend/application/reports/TechnicalAuditReportService";
import type { TechnicalAuditReportDocument } from "@/backend/application/reports/technicalAuditReportTypes";
import { findTechnicalAuditReportByAudit } from "@/backend/infrastructure/reports/technicalAuditReportStore";
import { getAuditWorkflowDetails } from "@/backend/infrastructure/audits/auditWorkflowStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

type Params = { params: Promise<{ id: string }> };
async function reportForAudit(
  id: string,
  user: NonNullable<Awaited<ReturnType<typeof requirePermission>>["user"]>,
  refreshLayout = false
) {
  const details = await getAuditWorkflowDetails(id, user!);
  if (!details) throw new Error("Auditoria não encontrada.");
  const existing = await findTechnicalAuditReportByAudit(id);
  // Relatórios já gerados também devem receber o layout institucional atual
  // quando o usuário solicitar uma nova emissão.
  const currentDocument = createTechnicalReport({ auditId: id, checklist: details.checklist as any, audit: details.auditoria, responses: details.respostas });
  if (existing) {
    // Registros emitidos por versões anteriores podem não ter a coleção `items`.
    // Não descartamos o relatório: partimos sempre da auditoria atual e reaproveitamos
    // apenas as análises válidas que ainda possam ser associadas a uma pergunta.
    const legacyDocument = existing.document && typeof existing.document === "object"
      ? existing.document
      : null;
    const legacyItems = Array.isArray(legacyDocument?.items) ? legacyDocument.items : [];
    const previousByQuestion = new Map(
      legacyItems
        .filter((item): item is TechnicalAuditReportDocument["items"][number] => Boolean(item && typeof item.questionId === "string"))
        .map((item) => [item.questionId, item])
    );
    const document: TechnicalAuditReportDocument = {
      // A estrutura base é recriada para que campos obrigatórios adicionados depois
      // (itens, resumo e orientações) sejam restaurados sem apagar a auditoria.
      ...currentDocument,
      id: typeof legacyDocument?.id === "string" ? legacyDocument.id : existing.report.id,
      createdAt: typeof legacyDocument?.createdAt === "string" ? legacyDocument.createdAt : currentDocument.createdAt,
      objective: typeof legacyDocument?.objective === "string" ? legacyDocument.objective : currentDocument.objective,
      scope: typeof legacyDocument?.scope === "string" ? legacyDocument.scope : currentDocument.scope,
      planNumber: typeof legacyDocument?.planNumber === "string" ? legacyDocument.planNumber : currentDocument.planNumber,
      location: currentDocument.location,
      auditType: currentDocument.auditType,
      normativeReference: currentDocument.normativeReference,
      auditTeam: currentDocument.auditTeam,
      auditDate: currentDocument.auditDate,
      sectorResponsible: currentDocument.sectorResponsible,
      items: currentDocument.items.map((item) => {
        const previous = previousByQuestion.get(item.questionId);
        return previous
          ? {
              ...item,
              analysisAi: typeof previous.analysisAi === "string" ? previous.analysisAi : "",
              analysisFinal: typeof previous.analysisFinal === "string" ? previous.analysisFinal : "",
              normativeReferences: Array.isArray(previous.normativeReferences) ? previous.normativeReferences : [],
              generatedAt: typeof previous.generatedAt === "string" ? previous.generatedAt : undefined,
              approvedAt: typeof previous.approvedAt === "string" ? previous.approvedAt : undefined,
              approvedBy: typeof previous.approvedBy === "string" ? previous.approvedBy : undefined
            }
          : item;
      }),
      updatedAt: new Date().toISOString()
    };
    return refreshLayout ? persistTechnicalReport(document) : document;
  }
  const document = currentDocument;
  return persistTechnicalReport(document);
}
function view(document: Awaited<ReturnType<typeof reportForAudit>>) { return { id: document.id, auditId: document.auditId, auditCode: document.auditCode, status: document.status, completed: document.items.filter((item) => item.analysisAi).length, total: document.items.length, viewUrl: `/technical-reports/${document.id}`, previewUrl: `/api/relatorios-tecnicos/${document.id}/pdf`, downloadUrl: `/api/relatorios-tecnicos/${document.id}/pdf?download=1` }; }

export async function GET(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "reports.view"); if (auth.response) return auth.response;
  try { const { id } = await context.params; return NextResponse.json({ report: view(await reportForAudit(id, auth.user)) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível abrir o relatório técnico." }, { status: 400 }); }
}
export async function POST(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "records.edit"); if (auth.response) return auth.response;
  try {
    const { id } = await context.params; const payload = await request.json().catch(() => ({})); const document = await reportForAudit(id, auth.user, payload.action === "render" || !payload.action);
    if (payload.action === "regenerate") {
      const item = document.items.find((candidate) => candidate.questionId === payload.questionId);
      if (!item) throw new Error("Item do relatório técnico não encontrado.");
      item.analysisAi = ""; item.analysisFinal = ""; item.normativeReferences = [];
      document.updatedAt = new Date().toISOString();
      return NextResponse.json({ report: view(await generateTechnicalReportBatch(document, 1)) });
    }
    if (payload.action === "generate") return NextResponse.json({ report: view(await generateTechnicalReportBatch(document, Number(payload.limit) || 2)) });
    // A ação padrão emite imediatamente o PDF institucional; a revisão com IA
    // continua disponível apenas pelas ações explícitas de geração/revisão.
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
