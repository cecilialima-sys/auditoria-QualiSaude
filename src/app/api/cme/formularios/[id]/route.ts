import { NextRequest, NextResponse } from "next/server";
import { deleteCmeForm, getCmeForm, updateCmeForm } from "@/backend/infrastructure/cme/cmeFormStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const auth = await requirePermission(request, "records.create");
  if (auth.response) return auth.response;
  const form = await getCmeForm((await params).id);
  return form ? NextResponse.json(form) : NextResponse.json({ error: "Formulário CME não encontrado." }, { status: 404 });
}

export async function PUT(request: NextRequest, { params }: Context) {
  const auth = await requirePermission(request, "records.edit");
  if (auth.response) return auth.response;
  try { const form = await updateCmeForm((await params).id, await request.json()); return form ? NextResponse.json(form) : NextResponse.json({ error: "Formulário CME não encontrado." }, { status: 404 }); }
  catch (error) { console.error("[cme] Erro ao atualizar formulário", error); return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o formulário CME." }, { status: 400 }); }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await requirePermission(request, "records.delete");
  if (auth.response) return auth.response;
  try { return (await deleteCmeForm((await params).id)) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Formulário CME não encontrado." }, { status: 404 }); }
  catch (error) { console.error("[cme] Erro ao excluir formulário", error); return NextResponse.json({ error: "Não foi possível excluir o formulário CME." }, { status: 500 }); }
}
