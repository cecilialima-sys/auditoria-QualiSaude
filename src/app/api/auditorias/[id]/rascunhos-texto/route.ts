import { NextRequest, NextResponse } from "next/server";
import { saveAuditWorkflowTextDraft } from "@/backend/infrastructure/audits/auditWorkflowStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

type Params = { params: Promise<{ id: string }> };

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
}

export async function PATCH(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "records.edit");
  if (auth.response) return auth.response;
  if (!auth.user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const result = await saveAuditWorkflowTextDraft(id, await request.json(), auth.user, getClientIp(request));
    if (result.conflict) return NextResponse.json({ error: "Este campo foi alterado em outra sessão. Seu texto local foi preservado para revisão.", draft: result.draft }, { status: 409 });
    console.info("[audit-autosave] Text draft saved", { auditId: id, questionId: result.draft.perguntaId, field: result.draft.campo, revision: result.draft.revisao });
    return NextResponse.json({ ok: true, draft: result.draft });
  } catch (error) {
    console.warn("[audit-autosave] Text draft save failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar o rascunho." }, { status: 400 });
  }
}

export async function POST(request: NextRequest, context: Params) {
  return PATCH(request, context);
}
