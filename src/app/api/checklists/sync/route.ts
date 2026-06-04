import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";
import { createMobileSyncRecord, type MobileChecklistAnswer } from "@/backend/infrastructure/mobile/mobileSyncStore";
import { checklistTemplateGroups } from "@/lib/checklists/checklist-template";

type SyncPayload = {
  idLocal?: string;
  checklistId?: string;
  setor?: string;
  leito?: string;
  respostas?: MobileChecklistAnswer[];
  criadoEm?: string;
  atualizadoEm?: string;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
}

function validatePayload(payload: SyncPayload) {
  if (!payload.idLocal || typeof payload.idLocal !== "string") return "idLocal é obrigatório.";
  if (!payload.checklistId || typeof payload.checklistId !== "string") return "checklistId é obrigatório.";
  if (!payload.setor || typeof payload.setor !== "string") return "setor é obrigatório.";
  if (!Array.isArray(payload.respostas) || payload.respostas.length === 0) return "respostas é obrigatório.";

  const checklist = checklistTemplateGroups.find((group) => group.id === payload.checklistId);
  if (!checklist) return "Checklist não encontrado.";

  const questionIds = new Set(checklist.questions.map((question) => question.id));
  const invalidAnswer = payload.respostas.find((answer) => {
    if (!answer || typeof answer !== "object") return true;
    if (!answer.perguntaId || !questionIds.has(answer.perguntaId)) return true;
    if (typeof answer.resposta !== "string" || !answer.resposta.trim()) return true;
    return false;
  });

  if (invalidAnswer) return "Existem respostas inválidas para este checklist.";
  return null;
}

export async function POST(request: NextRequest) {
  const auth = requirePermission(request, "records.create");
  if (auth.response) return auth.response;
  if (!auth.user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });

  let payload: SyncPayload;
  try {
    payload = (await request.json()) as SyncPayload;
  } catch {
    return badRequest("JSON inválido.");
  }

  const validationError = validatePayload(payload);
  if (validationError) return badRequest(validationError);

  const now = new Date().toISOString();
  const result = createMobileSyncRecord(
    {
      idLocal: payload.idLocal!,
      checklistId: payload.checklistId!,
      usuarioId: auth.user.id,
      usuarioEmail: auth.user.email,
      setor: payload.setor!,
      leito: payload.leito,
      respostas: payload.respostas!,
      criadoEm: payload.criadoEm ?? now,
      atualizadoEm: payload.atualizadoEm ?? now
    },
    getClientIp(request)
  );

  return NextResponse.json({
    ok: true,
    status: "sincronizado",
    duplicated: result.duplicated,
    idLocal: result.record.idLocal,
    serverId: result.record.id,
    receivedAt: result.record.recebidoEm
  });
}
