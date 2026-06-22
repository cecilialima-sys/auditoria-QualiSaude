import { NextRequest, NextResponse } from "next/server";
import { listUnfinishedAuditWorkflows } from "@/backend/infrastructure/audits/auditWorkflowStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "checklists.view");
  if (auth.response) return auth.response;
  if (!auth.user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });

  try {
    const auditorias = await listUnfinishedAuditWorkflows(auth.user);
    return NextResponse.json({ auditorias });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível carregar as auditorias não finalizadas." },
      { status: 500 }
    );
  }
}
