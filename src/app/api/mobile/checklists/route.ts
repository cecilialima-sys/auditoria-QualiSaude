import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";
import { checklistQuestionInfo } from "@/lib/checklists/question-info";
import { checklistTemplateGroups } from "@/lib/checklists/checklist-template";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "checklists.view");
  if (auth.response) return auth.response;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    checklists: checklistTemplateGroups.map((group) => ({
      id: group.id,
      sourceFile: group.sourceFile,
      sector: group.sector ?? group.category,
      category: group.category,
      totalQuestions: group.questions.length,
      questions: group.questions.map((question) => ({
        id: question.id,
        checklistId: group.id,
        area: question.area,
        pergunta: question.pergunta,
        explicacao: checklistQuestionInfo(question),
        section: question.section ?? group.category,
        itemNumber: question.itemNumber ?? `${group.category.match(/^\d+(?:\.\d+)?/)?.[0] ?? ""}.${question.ordem}`,
        obrigatoria: question.obrigatoria ?? true,
        tipoResposta: question.tipoResposta ?? "sim_nao",
        ordem: question.ordem
      }))
    }))
  });
}
