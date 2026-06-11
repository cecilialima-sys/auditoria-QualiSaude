import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "reports.export");
  if (auth.response) return auth.response;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Auditoria");
  sheet.columns = [
    { header: "Setor", key: "setor", width: 28 },
    { header: "Conformidade", key: "conformidade", width: 16 },
    { header: "Não conformidades", key: "naoConformidades", width: 20 },
    { header: "Risco", key: "risco", width: 14 }
  ];
  sheet.addRows([]);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F78B8" } };
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=qualisaude-auditoria.xlsx"
    }
  });
}

