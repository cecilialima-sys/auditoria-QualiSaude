import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "reports.export");
  if (auth.response) return auth.response;

  const text = "QualiSaúde Hospitalar - Nenhum relatório gerado";
  const stream = `BT /F1 14 Tf 50 760 Td (${text}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`
  ];
  const body = `%PDF-1.4\n${objects.join("\n")}\ntrailer << /Root 1 0 R >>\n%%EOF`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=qualisaude-relatório-auditoria.pdf"
    }
  });
}

