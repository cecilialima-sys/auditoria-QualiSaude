import { NextRequest, NextResponse } from "next/server";
import { AuditReportPdfService } from "@/backend/application/reports/AuditReportPdfService";
import {
  finalizeAuditWorkflow,
  saveAuditWorkflowResponses,
  type AuditWorkflowResponseRecord
} from "@/backend/infrastructure/audits/auditWorkflowStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

type Params = {
  params: Promise<{ id: string }>;
};

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
}

function responseByQuestion(respostas: AuditWorkflowResponseRecord[]) {
  return new Map(respostas.map((response) => [response.perguntaId, response]));
}

export async function POST(request: NextRequest, context: Params) {
  const auth = requirePermission(request, "records.edit");
  if (auth.response) return auth.response;
  if (!auth.user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });

  try {
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));
    if (Array.isArray(payload.respostas) && payload.respostas.length) {
      await saveAuditWorkflowResponses(id, payload.respostas, auth.user, getClientIp(request));
    }

    const finalized = await finalizeAuditWorkflow(id, auth.user, getClientIp(request));
    const answers = responseByQuestion(finalized.respostas);
    const service = new AuditReportPdfService();
    const result = await service.finalizeAndGenerate(
      {
        checklistId: finalized.auditoria.checklistId,
        institution: "QualiSaúde Hospitalar",
        sector: finalized.auditoria.setor,
        auditType: finalized.auditoria.tipoAuditoria || "Auditoria hospitalar",
        auditDate: finalized.auditoria.dataInicio,
        sectorResponsible: finalized.auditoria.responsavelSetor,
        method: "Checklist vinculado à auditoria persistida no sistema.",
        signed: true,
        responses: finalized.checklist.perguntas.map((question) => {
          const answer = answers.get(question.id);
          return {
            questionId: question.id,
            item: question.text,
            criterion: question.criterion,
            status: (answer?.resposta || "Não se aplica") as "Conforme" | "Não conforme" | "Não se aplica",
            observation: answer?.observacao,
            evidence: answer?.evidencia,
            risk: answer?.risco
          };
        })
      },
      auth.user
    );

    return NextResponse.json({
      ok: true,
      auditoria: finalized.auditoria,
      report: {
        id: result.report.id,
        auditCode: result.report.auditCode,
        sector: result.report.sector,
        result: result.report.result,
        compliancePercentage: result.report.compliancePercentage,
        generatedAt: result.report.generatedAt,
        viewUrl: `/reports/${result.report.id}`,
        downloadUrl: `/api/reports/${result.report.id}/pdf?download=1`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível finalizar auditoria." }, { status: 400 });
  }
}
