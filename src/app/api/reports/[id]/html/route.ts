import { NextRequest, NextResponse } from "next/server";
import { readStoredAuditReportHtml } from "@/backend/infrastructure/reports/auditReportStore";
import { requirePermission } from "@/backend/presentation/middlewares/authorization";

type Params = {
  params: Promise<{ id: string }>;
};

function withAutoPrint(html: string) {
  return html.replace(
    "</body>",
    `<script>
      window.addEventListener("load", () => {
        window.focus();
        window.print();
      });
    </script></body>`
  );
}

export async function GET(request: NextRequest, context: Params) {
  const auth = await requirePermission(request, "reports.view");
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const stored = readStoredAuditReportHtml(id);
  if (!stored) return NextResponse.json({ error: "Relatorio nao encontrado ou sem HTML de preview." }, { status: 404 });

  const shouldPrint = request.nextUrl.searchParams.get("print") === "1";

  return new NextResponse(shouldPrint ? withAutoPrint(stored.html) : stored.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex"
    }
  });
}
