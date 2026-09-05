import { NextRequest, NextResponse } from "next/server";
import { AuditEvidenceAiService, EvidenceAiError, type EvidenceImprovementInput } from "@/backend/application/services/AuditEvidenceAiService";
import { getAuditWorkflowDetails, saveAuditWorkflowResponses, type SaveAuditWorkflowResponseInput } from "@/backend/infrastructure/audits/auditWorkflowStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

type Params = { params: Promise<{ id: string }> };
type RequestedEvidence = {
  perguntaId?: string;
  evidenciaOriginal?: string;
  resposta?: string;
  observacao?: string;
  risco?: string;
  estilo?: EvidenceImprovementInput["style"];
};

const allowedAnswers = new Set(["Conforme", "Não conforme", "Não se aplica"]);

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, callback: (item: T) => Promise<R>) {
  const results: R[] = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await callback(items[index]);
      }
    })
  );
  return results;
}

export async function POST(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "records.edit");
  if (auth.response) return auth.response;
  if (!auth.user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });

  try {
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));
    const requested: RequestedEvidence[] = Array.isArray(payload.evidencias) ? payload.evidencias : [];
    if (!requested.length) return NextResponse.json({ error: "Nenhuma evidência foi informada." }, { status: 400 });
    if (requested.length > 100) return NextResponse.json({ error: "Envie no máximo 100 evidências por vez." }, { status: 400 });

    const details = await getAuditWorkflowDetails(id, auth.user);
    if (!details) return NextResponse.json({ error: "Auditoria não encontrada." }, { status: 404 });
    if (details.auditoria.status === "finalizada" || details.auditoria.status === "cancelada") {
      return NextResponse.json({ error: "Não é permitido alterar evidências desta auditoria." }, { status: 400 });
    }

    const questionById = new Map(details.checklist.perguntas.map((question) => [question.id, question]));
    const existingByQuestion = new Map(details.respostas.map((response) => [response.perguntaId, response]));
    const service = new AuditEvidenceAiService();
    const ip = getClientIp(request);

    const results = await mapWithConcurrency(requested, 2, async (entry) => {
      const question = entry.perguntaId ? questionById.get(entry.perguntaId) : undefined;
      const existing = entry.perguntaId ? existingByQuestion.get(entry.perguntaId) : undefined;
      const answer = entry.resposta || existing?.resposta;
      const original = entry.evidenciaOriginal?.trim() || existing?.evidenciaOriginal || existing?.evidencia || "";

      if (!question || !entry.perguntaId) return { perguntaId: entry.perguntaId, error: "Item de checklist inválido." };
      if (!allowedAnswers.has(answer ?? "")) return { perguntaId: entry.perguntaId, error: "Selecione a classificação do item antes de melhorar a evidência." };
      if (!original) return { perguntaId: entry.perguntaId, error: "Adicione uma evidência antes de utilizar a melhoria por IA." };

      try {
        const suggestion = await service.improveEvidence({
          checklistTitle: details.checklist.titulo,
          itemNumber: question.itemNumber,
          itemText: question.text,
          status: answer as EvidenceImprovementInput["status"],
          evidenceOriginal: original,
          style: entry.estilo
        });

        const response: SaveAuditWorkflowResponseInput = {
          perguntaId: entry.perguntaId,
          resposta: answer,
          status: answer,
          observacao: entry.observacao ?? existing?.observacao,
          evidencia: original,
          evidenciaOriginal: original,
          evidenciaIa: suggestion,
          evidenciaFinal: existing?.evidenciaFinal,
          fonteEvidenciaFinal: existing?.fonteEvidenciaFinal,
          risco: entry.risco ?? existing?.risco
        };
        await saveAuditWorkflowResponses(id, [response], auth.user, ip);
        return { perguntaId: entry.perguntaId, sugestao: suggestion };
      } catch (error) {
        return {
          perguntaId: entry.perguntaId,
          error: error instanceof Error ? error.message : "Não foi possível melhorar esta evidência."
        };
      }
    });

    const hasSuccess = results.some((result) => "sugestao" in result);
    if (!hasSuccess && requested.length === 1) {
      const failure = results[0];
      return NextResponse.json({ error: failure.error ?? "Não foi possível melhorar a evidência." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, resultados: results });
  } catch (error) {
    const status = error instanceof EvidenceAiError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível melhorar as evidências." }, { status });
  }
}
