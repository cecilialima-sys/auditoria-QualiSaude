import { NextRequest, NextResponse } from "next/server";
import { createCmeForm, listCmeForms } from "@/backend/infrastructure/cme/cmeFormStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "records.create");
  if (auth.response) return auth.response;
  try { return NextResponse.json({ formularios: await listCmeForms() }); }
  catch (error) { console.error("[cme] Erro ao listar formulários", error); return NextResponse.json({ error: "Não foi possível carregar os formulários CME." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "records.create");
  if (auth.response) return auth.response;
  try { return NextResponse.json(await createCmeForm(await request.json()), { status: 201 }); }
  catch (error) { console.error("[cme] Erro ao criar formulário", error); return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar o formulário CME." }, { status: 400 }); }
}
