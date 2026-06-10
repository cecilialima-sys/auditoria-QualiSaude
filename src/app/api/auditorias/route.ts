import { NextRequest, NextResponse } from "next/server";
import { createAuditWorkflow } from "@/backend/infrastructure/audits/auditWorkflowStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
}

export async function POST(request: NextRequest) {
  const auth = requirePermission(request, "records.create");
  if (auth.response) return auth.response;
  if (!auth.user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });

  try {
    const payload = await request.json();
    const auditoria = await createAuditWorkflow(payload, auth.user, getClientIp(request));
    return NextResponse.json({
      id: auditoria.id,
      setor: auditoria.setor,
      responsavelSetor: auditoria.responsavelSetor,
      checklistId: auditoria.checklistId,
      checklistTitulo: auditoria.checklistTitulo,
      auditorId: auditoria.auditorId,
      auditorNome: auditoria.auditorNome,
      status: auditoria.status,
      dataInicio: auditoria.dataInicio
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível criar a auditoria." }, { status: 400 });
  }
}
