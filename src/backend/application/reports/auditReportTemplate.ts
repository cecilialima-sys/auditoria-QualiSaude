import type { AuditReportDocument } from "@/backend/application/reports/auditReportTypes";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function rows<T>(items: T[], render: (item: T, index: number) => string, empty: string) {
  if (!items.length) return `<tr><td colspan="6" class="muted">${escapeHtml(empty)}</td></tr>`;
  return items.map(render).join("");
}

export function renderAuditReportHtml(report: AuditReportDocument) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório de Auditoria Hospitalar - ${escapeHtml(report.auditCode)}</title>
  <style>
    @page { size: A4; margin: 18mm 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1f3446; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.45; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 18px; border-bottom: 4px solid #0f78b8; padding-bottom: 14px; margin-bottom: 18px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand img { width: 96px; height: auto; }
    .brand strong { display: block; color: #0a5f99; font-size: 18px; }
    .brand span { color: #657789; }
    .code { text-align: right; color: #657789; font-size: 11px; }
    h1 { margin: 18px 0 6px; color: #0a5f99; font-size: 22px; text-align: center; letter-spacing: 0; }
    h2 { margin: 20px 0 8px; color: #0a5f99; font-size: 15px; border-bottom: 1px solid #d9e8f2; padding-bottom: 5px; }
    h3 { margin: 0 0 6px; font-size: 13px; color: #1f3446; }
    p { margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td { border: 1px solid #d9e8f2; padding: 7px; vertical-align: top; }
    th { background: #edf7fd; color: #0a5f99; font-weight: 700; text-align: left; }
    .cover { border: 1px solid #d9e8f2; border-radius: 8px; padding: 18px; margin-bottom: 14px; background: #f7fcff; }
    .cover-grid, .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .box { border: 1px solid #d9e8f2; border-radius: 6px; padding: 10px; background: #fff; }
    .box small { display: block; color: #657789; font-weight: 700; margin-bottom: 4px; }
    .metric { color: #0a5f99; font-size: 18px; font-weight: 800; }
    .badge { display: inline-block; border-radius: 999px; padding: 3px 8px; color: #fff; background: #0f78b8; font-weight: 700; }
    .danger { background: #b91c1c; }
    .warning { background: #b7791f; }
    .success { background: #047857; }
    .muted { color: #657789; }
    .signature { margin-top: 34px; text-align: center; page-break-inside: avoid; }
    .signature-line { width: 280px; border-top: 1px solid #1f3446; margin: 44px auto 8px; }
    footer { position: fixed; bottom: -10mm; left: 0; right: 0; color: #657789; font-size: 10px; text-align: center; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <img src="file://${process.cwd().replaceAll("\\", "/")}/public/qualisaude-logo.png" alt="QualiSaúde" />
      <div>
        <strong>${escapeHtml(report.institution)}</strong>
        <span>Auditoria Hospitalar</span>
      </div>
    </div>
    <div class="code">
      <div>Código: <strong>${escapeHtml(report.auditCode)}</strong></div>
      <div>Gerado em: ${formatDate(report.generatedAt)}</div>
    </div>
  </header>

  <footer>QualiSaúde Hospitalar - Relatório gerado automaticamente pelo sistema</footer>

  <section class="cover">
    <h1>RELATÓRIO DE AUDITORIA HOSPITALAR</h1>
    <div class="cover-grid">
      <div class="box"><small>Setor auditado</small>${escapeHtml(report.sector)}</div>
      <div class="box"><small>Tipo de auditoria</small>${escapeHtml(report.auditType)}</div>
      <div class="box"><small>Auditor responsável</small>${escapeHtml(report.auditor.name)}</div>
      <div class="box"><small>Data da auditoria</small>${formatDate(report.auditDate)}</div>
      <div class="box"><small>Finalização</small>${formatDate(report.finalizedAt)}</div>
      <div class="box"><small>Resultado</small><span class="badge ${report.summary.result === "Conforme" ? "success" : report.summary.result === "Não conforme" ? "danger" : "warning"}">${escapeHtml(report.summary.result)}</span></div>
    </div>
  </section>

  <h2>1. Identificação</h2>
  <table>
    <tbody>
      <tr><th>Instituição auditada</th><td>${escapeHtml(report.institution)}</td><th>Setor</th><td>${escapeHtml(report.sector)}</td></tr>
      <tr><th>Período da auditoria</th><td>${formatDate(report.auditDate)}</td><th>Data do relatório</th><td>${formatDate(report.generatedAt)}</td></tr>
      <tr><th>Auditor</th><td>${escapeHtml(report.auditor.name)}</td><th>Cargo/função</th><td>${escapeHtml(report.auditor.position ?? report.auditor.role)}</td></tr>
      <tr><th>Tipo</th><td>${escapeHtml(report.auditType)}</td><th>Método utilizado</th><td>${escapeHtml(report.method)}</td></tr>
      <tr><th>Unidade/setor/leito</th><td>${escapeHtml(report.unit || "-")}</td><th>Responsável pelo setor</th><td>${escapeHtml(report.sectorResponsible || "-")}</td></tr>
    </tbody>
  </table>

  <h2>2. Objetivo da auditoria</h2>
  <p>${escapeHtml(report.objective)}</p>

  <h2>3. Critérios avaliados</h2>
  <table>
    <thead><tr><th>#</th><th>Item avaliado</th><th>Resposta/status</th><th>Observação</th><th>Risco</th><th>Prazo</th></tr></thead>
    <tbody>
      ${rows(
        report.items,
        (item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.item)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.observation || "-")}</td><td>${escapeHtml(item.risk || "-")}</td><td>${escapeHtml(item.deadline || "-")}</td></tr>`,
        "Nenhum item avaliado."
      )}
    </tbody>
  </table>

  <h2>4. Resumo quantitativo</h2>
  <div class="summary-grid">
    <div class="box"><small>Total avaliado</small><span class="metric">${report.summary.totalItems}</span></div>
    <div class="box"><small>Conformes</small><span class="metric">${report.summary.conformingItems}</span></div>
    <div class="box"><small>Não conformes</small><span class="metric">${report.summary.nonConformingItems}</span></div>
    <div class="box"><small>Não se aplica</small><span class="metric">${report.summary.notApplicableItems}</span></div>
    <div class="box"><small>Conformidade</small><span class="metric">${report.summary.compliancePercentage}%</span></div>
  </div>

  <h2>5. Achados da auditoria</h2>
  <p>${escapeHtml(report.findings)}</p>

  <h2>6. Não conformidades encontradas</h2>
  <table>
    <thead><tr><th>#</th><th>Item não conforme</th><th>Evidência/observação</th><th>Risco</th><th>Gravidade</th><th>Prioridade</th></tr></thead>
    <tbody>
      ${rows(
        report.nonConformities,
        (item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.item)}</td><td>${escapeHtml(item.observation || "-")}</td><td>${escapeHtml(item.risk || "-")}</td><td>${escapeHtml(item.gravity)}</td><td>${escapeHtml(item.priority)}</td></tr>`,
        "Não foram registradas não conformidades."
      )}
    </tbody>
  </table>

  <h2>7. Recomendações automáticas</h2>
  <table>
    <thead><tr><th>Problema</th><th>Recomendação</th><th>Responsável sugerido</th><th>Prazo</th><th>Indicador</th></tr></thead>
    <tbody>
      ${rows(
        report.recommendations,
        (item) => `<tr><td>${escapeHtml(item.problem)}</td><td>${escapeHtml(item.recommendation)}</td><td>${escapeHtml(item.suggestedResponsible)}</td><td>${escapeHtml(item.suggestedDeadline)}</td><td>${escapeHtml(item.indicator)}</td></tr>`,
        "Sem recomendações automáticas; não foram encontradas não conformidades."
      )}
    </tbody>
  </table>

  <h2>8. Plano de ação automático</h2>
  <table>
    <thead><tr><th>Problema identificado</th><th>Ação proposta</th><th>Responsável</th><th>Prazo</th><th>Indicador</th></tr></thead>
    <tbody>
      ${rows(
        report.actionPlan,
        (item) => `<tr><td>${escapeHtml(item.sourceItem)}</td><td>${escapeHtml(item.recommendation)}</td><td>${escapeHtml(item.suggestedResponsible)}</td><td>${escapeHtml(item.suggestedDeadline)}</td><td>${escapeHtml(item.indicator)}</td></tr>`,
        "Sem plano de ação automático para este relatório."
      )}
    </tbody>
  </table>

  <h2>9. Parecer final</h2>
  <p><strong>Resultado da auditoria: ${escapeHtml(report.summary.result)}.</strong> ${escapeHtml(report.summary.finalOpinion)}</p>

  <h2>10. Assinatura do auditor</h2>
  <div class="signature">
    <div class="signature-line"></div>
    <strong>${escapeHtml(report.auditor.name)}</strong><br />
    ${escapeHtml(report.auditor.position ?? report.auditor.role)}${report.auditor.coren ? ` - COREN ${escapeHtml(report.auditor.coren)}` : ""}<br />
    Data do relatório: ${formatDate(report.generatedAt)}
  </div>
</body>
</html>`;
}
