import { NextRequest, NextResponse } from "next/server";
import { findTechnicalAuditReport } from "@/backend/infrastructure/reports/technicalAuditReportStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) { const auth = await requirePermission(request, "reports.view"); if (auth.response) return auth.response; const { id } = await context.params; const stored = await findTechnicalAuditReport(id); if (!stored) return NextResponse.json({ error: "Relatório técnico não encontrado." }, { status: 404 }); return NextResponse.json(stored.document); }
