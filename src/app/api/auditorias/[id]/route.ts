import { NextRequest, NextResponse } from "next/server";
import { getAuditWorkflowDetails } from "@/backend/infrastructure/audits/auditWorkflowStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "checklists.view");
  if (auth.response) return auth.response;
  if (!auth.user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });

  try {
    const { id } = await context.params;
    const details = await getAuditWorkflowDetails(id, auth.user);
    if (!details) return NextResponse.json({ error: "Auditoria não encontrada." }, { status: 404 });
    return NextResponse.json(details);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar a auditoria." }, { status: 400 });
  }
}
