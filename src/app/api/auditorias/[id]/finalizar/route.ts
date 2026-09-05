import { NextRequest, NextResponse } from "next/server";
import { AuditReportPdfService } from "@/backend/application/reports/AuditReportPdfService";
import {
  finalizeAuditWorkflow,
  getAuditWorkflowDetails,
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

function assertAllQuestionsAnswered(details: NonNullable<Awaited<ReturnType<typeof getAuditWorkflowDetails>>>) {
  const answered = new Set(details.respostas.filter((response) => response.resposta).map((response) => response.perguntaId));
  if (answered.size !== details.checklist.perguntas.length) {
    throw new Error("Responda todos os itens do checklist antes de finalizar.");
  }
}

export async function POST(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "records.edit");
  if (auth.response) return auth.response;
  if (!auth.user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });

  try {
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));
    const ip = getClientIp(request);

    let details = await getAuditWorkflowDetails(id, auth.user);
    if (!details) throw new Error("Auditoria não encontrada.");

    if (details.auditoria.status !== "finalizada" && Array.isArray(payload.respostas) && payload.respostas.length) {
      await saveAuditWorkflowResponses(id, payload.respostas, auth.user, ip);
      details = await getAuditWorkflowDetails(id, auth.user);
      if (!details) throw new Error("Auditoria não encontrada.");
    }

    assertAllQuestionsAnswered(details);

    const answers = responseByQuestion(details.respostas);
    const service = new AuditReportPdfService();
    const result = await service.finalizeAndGenerate(
      {
        checklistId: details.auditoria.checklistId,
        institution: "QualiSaúde Hospitalar",
        unit: details.auditoria.setor,
        sector: details.auditoria.setor,
        auditType: details.auditoria.tipoAuditoria || "Auditoria hospitalar",
        auditDate: details.auditoria.dataInicio,
        sectorResponsible: details.auditoria.responsavelSetor,
        method: "Checklist vinculado à auditoria persistida no sistema.",
        signed: true,
        responses: details.checklist.perguntas.map((question) => {
          const answer = answers.get(question.id);
          return {
            questionId: question.id,
            item: question.text,
            criterion: question.criterion,
            status: (answer?.resposta || "Não se aplica") as "Conforme" | "Não conforme" | "Não se aplica",
            observation: answer?.observacao,
            // Somente a versão explicitamente aprovada entra no relatório. Para dados
            // anteriores, a evidência já existente continua sendo utilizada.
            evidence: answer?.evidenciaFinal || answer?.evidenciaOriginal || answer?.evidencia,
            risk: answer?.risco
          };
        })
      },
      auth.user
    );

    const finalized =
      details.auditoria.status === "finalizada"
        ? { auditoria: details.auditoria }
        : await finalizeAuditWorkflow(id, auth.user, ip);

    return NextResponse.json({
      ok: true,
      auditoria: finalized.auditoria,
      report: {
        id: result.report.id,
        auditCode: result.report.auditCode,
        sector: result.report.sector,
        result: result.report.result,
        compliancePercentage: result.report.compliancePercentage,
        metrics: result.document.summary,
        generatedAt: result.report.generatedAt,
        viewUrl: `/reports/${result.report.id}`,
        downloadUrl: `/api/reports/${result.report.id}/pdf?download=1`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível finalizar auditoria." }, { status: 400 });
  }
}
