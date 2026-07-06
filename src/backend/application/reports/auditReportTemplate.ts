import type { AuditReportDocument, AuditReportItemInput } from "@/backend/application/reports/auditReportTypes";
import type { AuditIntervention } from "@/backend/application/reports/auditInterventionRules";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function display(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? escapeHtml(text) : "Não informado";
}

function formatDate(value: string, includeTime = true) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return display(value);
  return new Intl.DateTimeFormat("pt-BR", includeTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" }).format(date);
}

function statusClass(status: string) {
  if (status === "Conforme") return "status-ok";
  if (status === "Não conforme") return "status-bad";
  return "status-na";
}

function statusMeaning(status: string) {
  if (status === "Conforme") return "Adequado.";
  if (status === "Não conforme") return "Ação corretiva obrigatória.";
  return "Item não considerado na pontuação.";
}

function publicAssetDataUri(fileName: string, mimeType: string, label: string) {
  const filePath = join(process.cwd(), "public", fileName);
  if (existsSync(filePath)) {
    const base64 = readFileSync(filePath).toString("base64");
    return `data:${mimeType};base64,${base64}`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="140" viewBox="0 0 360 140"><rect width="360" height="140" fill="#f4f7fa" stroke="#b8c8d6"/><text x="180" y="74" text-anchor="middle" font-family="Arial" font-size="18" fill="#425466">${escapeHtml(label)}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function renderResultItem(item: AuditReportItemInput, index: number) {
  return `
    <article class="question-block">
      <div class="question-top">
        <div class="question-number">Pergunta ${String(index + 1).padStart(2, "0")}</div>
        <span class="status-pill ${statusClass(item.status)}">${display(item.status)}</span>
      </div>
      <h3>${display(item.item)}</h3>
      <dl class="question-details">
        <div><dt>Resposta</dt><dd>${display(item.status)}</dd></div>
        <div><dt>Status</dt><dd>${statusMeaning(item.status)}</dd></div>
        <div><dt>Critério</dt><dd>${display(item.criterion)}</dd></div>
        <div><dt>Observação</dt><dd>${display(item.observation)}</dd></div>
        <div><dt>Evidência</dt><dd>${display(item.evidence)}</dd></div>
        <div><dt>Risco</dt><dd>${display(item.risk)}</dd></div>
      </dl>
    </article>`;
}

function renderIntervention(intervention: AuditIntervention, index: number) {
  return `
    <article class="intervention-block">
      <div class="intervention-heading">
        <div>
          <span class="intervention-number">Intervenção sugerida ${String(index + 1).padStart(2, "0")}</span>
          <h3>${display(intervention.sourceItem)}</h3>
        </div>
        <span class="severity-pill severity-${normalizeCssToken(intervention.severity)}">${display(intervention.severity)}</span>
      </div>
      <dl class="intervention-details">
        <div><dt>Item não conforme</dt><dd>${display(intervention.sourceItem)}</dd></div>
        <div><dt>Categoria/Setor</dt><dd>${display(intervention.category)}</dd></div>
        <div class="wide"><dt>Não conformidade identificada</dt><dd>${display(intervention.nonConformity)}</dd></div>
        <div><dt>Gravidade</dt><dd>${display(intervention.severity)}</dd></div>
        <div><dt>Reincidência</dt><dd>${intervention.recurrent ? `Sim (${intervention.recurrenceCount} ocorrências incluindo a atual)` : "Não identificada no histórico disponível"}</dd></div>
        <div class="wide"><dt>Intervenção sugerida</dt><dd>${display(intervention.suggestedIntervention)}</dd></div>
        <div><dt>Responsável sugerido</dt><dd>${display(intervention.suggestedResponsible)}</dd></div>
        <div><dt>Prazo sugerido</dt><dd>${display(intervention.suggestedDeadline)}</dd></div>
        <div class="wide"><dt>Evidência recomendada</dt><dd>${display(intervention.recommendedEvidence)}</dd></div>
        <div class="wide"><dt>Verificação de eficácia</dt><dd>${display(intervention.effectivenessVerification)}</dd></div>
      </dl>
    </article>`;
}

function normalizeCssToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-");
}

function renderActionPlanItem(item: AuditReportDocument["actionPlan"][number], index: number) {
  return `<tr>
    <td>${index + 1}</td>
    <td>${display(item.sourceItem)}</td>
    <td>${display(item.problem)}</td>
    <td>${display(item.recommendation)}</td>
    <td>${display(item.suggestedResponsible)}</td>
    <td>${display(item.suggestedDeadline)}</td>
    <td>${display(item.priority)}</td>
  </tr>`;
}

function rows<T>(items: T[], render: (item: T, index: number) => string, empty: string, colspan = 5) {
  if (!items.length) return `<tr><td colspan="${colspan}" class="muted">${escapeHtml(empty)}</td></tr>`;
  return items.map(render).join("");
}

export function renderAuditReportHtml(report: AuditReportDocument) {
  const govLogo = publicAssetDataUri("template-gov-brasao.png", "image/png", "Brasão");
  const unifalLogo = publicAssetDataUri("template-unifal-logo.jpg", "image/jpeg", "UNIFAL-MG");
  const qualiLogo = publicAssetDataUri("qualisaude-logo.png", "image/png", "QualiSaúde Hospitalar");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório de Auditoria Hospitalar - ${display(report.auditCode)}</title>
  <style>
    @page { size: A4; margin: 13mm 14mm 16mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      color: #17202a;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11.5px;
      line-height: 1.46;
      background: #ffffff;
    }
    .page {
      min-height: 267mm;
      page-break-after: always;
      position: relative;
    }
    .page:last-child { page-break-after: auto; }
    .cover-page {
      display: flex;
      min-height: 267mm;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
    }
    .year-top {
      color: #1f5f8b;
      font-size: 13px;
      font-weight: 700;
      text-align: right;
      margin-bottom: 4mm;
    }
    .official-header {
      display: grid;
      grid-template-columns: 80px 1fr 112px;
      align-items: center;
      gap: 14px;
      border-bottom: 1.4px solid #1f2933;
      padding-bottom: 8px;
      margin-bottom: 20mm;
    }
    .official-header img.gov { width: 66px; height: auto; justify-self: start; }
    .official-header img.unifal { width: 108px; height: auto; justify-self: end; }
    .official-text { text-align: center; color: #111827; line-height: 1.25; font-size: 10.8px; }
    .official-text strong {
      display: block;
      font-size: 11.6px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .system-logo { width: 190px; height: auto; margin: 0 auto 18mm; display: block; }
    .document-title {
      color: #0d5f95;
      font-size: 21px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
      margin: 0 0 6mm;
    }
    .cover-subtitle {
      color: #243443;
      font-size: 13px;
      margin: 0 auto 12mm;
      max-width: 130mm;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      max-width: 150mm;
      margin: 0 auto;
      text-align: left;
    }
    .meta-card {
      border: 1px solid #c3d8e8;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fbfd;
      min-height: 42px;
    }
    .meta-card small {
      color: #516579;
      display: block;
      font-size: 9.5px;
      font-weight: 700;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .cover-footer {
      border-top: 1px solid #c9d6e2;
      color: #0d5f95;
      font-size: 13px;
      font-weight: 700;
      padding-top: 8px;
      text-align: center;
    }
    .content-header {
      display: grid;
      grid-template-columns: 56px 1fr 82px;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #c9d6e2;
      margin-bottom: 10px;
      padding-bottom: 7px;
    }
    .content-header img.gov { width: 46px; }
    .content-header img.unifal { width: 78px; justify-self: end; }
    .content-title { color: #1f2933; text-align: center; line-height: 1.25; font-size: 10px; }
    h2 {
      color: #0d5f95;
      font-size: 14px;
      margin: 14px 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #b9d4e7;
      text-transform: uppercase;
    }
    h3 { color: #17202a; font-size: 12px; margin: 5px 0 8px; }
    p { margin: 0 0 8px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 12px;
      page-break-inside: auto;
    }
    tr { page-break-inside: avoid; }
    th, td {
      border: 1px solid #a8c2d6;
      padding: 6px 7px;
      text-align: left;
      vertical-align: top;
    }
    th { background: #e2f0f9; color: #0b4e78; font-weight: 700; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 8px 0 12px;
    }
    .metric-card {
      border: 1px solid #c3d8e8;
      border-radius: 6px;
      background: #f8fbfd;
      padding: 8px;
      min-height: 48px;
    }
    .metric-card small {
      color: #516579;
      display: block;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .metric-card strong { color: #0d5f95; font-size: 19px; }
    .question-block {
      border: 1px solid #c3d8e8;
      border-radius: 6px;
      padding: 9px 10px;
      margin: 0 0 9px;
      page-break-inside: avoid;
    }
    .question-top {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
    }
    .question-number {
      color: #0d5f95;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .status-pill {
      border-radius: 999px;
      color: #fff;
      display: inline-block;
      font-size: 9.5px;
      font-weight: 700;
      padding: 3px 8px;
      white-space: nowrap;
    }
    .status-ok { background: #047857; }
    .status-bad { background: #b91c1c; }
    .status-na { background: #64748b; }
    .question-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 10px;
      margin: 0;
    }
    .question-details div { min-width: 0; }
    .question-details dt {
      color: #516579;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .question-details dd { margin: 1px 0 0; overflow-wrap: anywhere; }
    .classification-box {
      border: 1.5px solid #0d5f95;
      border-radius: 6px;
      background: #f2f8fc;
      padding: 10px 12px;
      margin: 10px 0 12px;
    }
    .intervention-notice {
      border-left: 4px solid #0d5f95;
      background: #f2f8fc;
      padding: 9px 11px;
      margin: 8px 0 12px;
    }
    .intervention-block {
      border: 1px solid #a8c2d6;
      border-radius: 6px;
      margin: 0 0 11px;
      padding: 10px 11px;
      page-break-inside: avoid;
    }
    .intervention-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid #d5e0e8;
      margin-bottom: 8px;
      padding-bottom: 6px;
    }
    .intervention-heading h3 { margin-bottom: 0; }
    .intervention-number {
      color: #0d5f95;
      display: block;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .severity-pill {
      border-radius: 999px;
      color: #fff;
      display: inline-block;
      font-size: 9.5px;
      font-weight: 700;
      padding: 3px 8px;
      white-space: nowrap;
    }
    .severity-leve { background: #047857; }
    .severity-moderada { background: #b7791f; }
    .severity-grave { background: #c2410c; }
    .severity-critica { background: #991b1b; }
    .intervention-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px 12px;
      margin: 0;
    }
    .intervention-details .wide { grid-column: 1 / -1; }
    .intervention-details dt {
      color: #516579;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .intervention-details dd {
      margin: 1px 0 0;
      overflow-wrap: anywhere;
    }
    .muted { color: #657789; }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18mm;
      margin-top: 28mm;
      page-break-inside: avoid;
    }
    .signature {
      border-top: 1px solid #17202a;
      padding-top: 6px;
      text-align: center;
    }
    .page-footer {
      color: #657789;
      border-top: 1px solid #d5e0e8;
      font-size: 9.5px;
      margin-top: 12mm;
      padding-top: 4px;
      text-align: center;
    }
  </style>
</head>
<body>
  <section class="page cover-page">
    <div>
      <div class="year-top">2026</div>
      <header class="official-header">
        <img class="gov" src="${govLogo}" alt="Brasão da República Federativa do Brasil" />
        <div class="official-text">
          <strong>MINISTÉRIO DA EDUCAÇÃO</strong>
          <span>Universidade Federal de Alfenas. UNIFAL-MG</span>
          <span>Rua Gabriel Monteiro da Silva, 700. Alfenas/MG. CEP 37130-000</span>
        </div>
        <img class="unifal" src="${unifalLogo}" alt="Universidade Federal de Alfenas" />
      </header>

      <img class="system-logo" src="${qualiLogo}" alt="QualiSaúde Hospitalar" />
      <h1 class="document-title">RELATÓRIO DE AUDITORIA HOSPITALAR</h1>
      <p class="cover-subtitle">${display(report.institution)}</p>

      <div class="cover-meta">
        <div class="meta-card"><small>Unidade auditada</small>${display(report.unit)}</div>
        <div class="meta-card"><small>Setor/Ala auditado</small>${display(report.sector)}</div>
        <div class="meta-card"><small>Auditor</small>${display(report.auditor.name)}</div>
        <div class="meta-card"><small>Tipo de checklist</small>${display(report.auditType)}</div>
        <div class="meta-card"><small>Data de geração</small>${formatDate(report.generatedAt)}</div>
        <div class="meta-card"><small>Número do relatório</small>${display(report.auditCode)}</div>
        <div class="meta-card"><small>Classificação</small>${display(report.summary.result)}</div>
      </div>
    </div>
    <footer class="cover-footer">2026</footer>
  </section>

  <section class="page">
    <header class="content-header">
      <img class="gov" src="${govLogo}" alt="Brasão" />
      <div class="content-title">
        <strong>MINISTÉRIO DA EDUCAÇÃO</strong><br />
        Universidade Federal de Alfenas. UNIFAL-MG<br />
        QualiSaúde Hospitalar
      </div>
      <img class="unifal" src="${unifalLogo}" alt="UNIFAL-MG" />
    </header>

    <h2>1. Identificação da Auditoria</h2>
    <table>
      <tbody>
        <tr><th>Hospital/Instituição</th><td>${display(report.institution)}</td><th>Unidade auditada</th><td>${display(report.unit)}</td></tr>
        <tr><th>Setor/Ala auditado</th><td>${display(report.sector)}</td><th>Responsável pelo setor</th><td>${display(report.sectorResponsible)}</td></tr>
        <tr><th>Tipo de checklist</th><td>${display(report.auditType)}</td><th>Nome do auditor</th><td>${display(report.auditor.name)}</td></tr>
        <tr><th>Cargo/Função</th><td>${display(report.auditor.position ?? report.auditor.role)}</td><th>Data da auditoria</th><td>${formatDate(report.auditDate, false)}</td></tr>
        <tr><th>Horário de início</th><td>${formatDate(report.auditDate)}</td><th>Horário de término</th><td>${formatDate(report.finalizedAt)}</td></tr>
        <tr><th>Número do relatório</th><td>${display(report.auditCode)}</td><th>Método</th><td>${display(report.method)}</td></tr>
      </tbody>
    </table>

    <h2>Objetivo</h2>
    <p>${display(report.objective)}</p>

    <h2>Resumo executivo</h2>
    <div class="classification-box">
      <p><strong>Percentual de conformidade:</strong> ${report.summary.compliancePercentage}%</p>
      <p><strong>Percentual de não conformidade:</strong> ${report.summary.nonCompliancePercentage}%</p>
      <p><strong>Classificação:</strong> ${display(report.summary.result)}</p>
      <p>${display(report.findings)}</p>
    </div>

    <div class="page-footer">QualiSaúde Hospitalar - ${display(report.auditCode)} - 2026</div>
  </section>

  <section class="page">
    <header class="content-header">
      <img class="gov" src="${govLogo}" alt="Brasão" />
      <div class="content-title"><strong>2. RESULTADOS DA AUDITORIA</strong><br />Checklist e evidências registradas</div>
      <img class="unifal" src="${unifalLogo}" alt="UNIFAL-MG" />
    </header>

    <h2>2. Resultados da Auditoria</h2>
    ${report.items.length ? report.items.map(renderResultItem).join("") : `<p class="muted">Não foi possível listar os resultados porque não existem respostas salvas para esta auditoria.</p>`}
    <div class="page-footer">QualiSaúde Hospitalar - ${display(report.auditCode)} - 2026</div>
  </section>

  ${report.interventions.length ? `
  <section class="page">
    <header class="content-header">
      <img class="gov" src="${govLogo}" alt="Brasão" />
      <div class="content-title"><strong>INTERVENÇÕES SUGERIDAS PARA AS NÃO CONFORMIDADES</strong><br />Apoio à análise e à tomada de decisão do auditor</div>
      <img class="unifal" src="${unifalLogo}" alt="UNIFAL-MG" />
    </header>

    <h2>Intervenções sugeridas para as não conformidades</h2>
    <p class="intervention-notice">
      As intervenções abaixo são sugestões automáticas baseadas em regras rastreáveis. Elas não substituem a análise,
      a validação nem a decisão profissional do auditor e da gestão responsável.
    </p>
    ${report.interventions.map(renderIntervention).join("")}
    <div class="page-footer">QualiSaúde Hospitalar - ${display(report.auditCode)} - 2026</div>
  </section>` : ""}

  <section class="page">
    <header class="content-header">
      <img class="gov" src="${govLogo}" alt="Brasão" />
      <div class="content-title"><strong>RECOMENDAÇÕES E PONTUAÇÃO</strong><br />Análise automática do relatório</div>
      <img class="unifal" src="${unifalLogo}" alt="UNIFAL-MG" />
    </header>

    ${!report.interventions.length ? `<p class="intervention-notice">Nenhuma intervenção necessária, pois não foram identificadas não conformidades.</p>` : ""}

    <h2>3. Recomendações</h2>
    <table>
      <thead><tr><th>Não conformidade ou melhoria</th><th>Recomendação</th><th>Responsável sugerido</th><th>Prazo</th><th>Indicador</th></tr></thead>
      <tbody>
        ${rows(
          report.recommendations,
          (item) => `<tr><td>${display(item.problem)}</td><td>${display(item.recommendation)}</td><td>${display(item.suggestedResponsible)}</td><td>${display(item.suggestedDeadline)}</td><td>${display(item.indicator)}</td></tr>`,
          "Sem recomendações críticas; não foram encontradas não conformidades.",
          5
        )}
      </tbody>
    </table>

    <h2>Plano de ação gerado pela árvore de decisão</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item não conforme</th>
          <th>Tipo/Problema</th>
          <th>Ação recomendada</th>
          <th>Responsável</th>
          <th>Prazo</th>
          <th>Prioridade</th>
        </tr>
      </thead>
      <tbody>
        ${rows(report.actionPlan, renderActionPlanItem, "Nenhuma intervenção necessária, pois não foram identificadas não conformidades.", 7)}
      </tbody>
    </table>

    <h2>Não conformidades identificadas</h2>
    <table>
      <thead><tr><th>#</th><th>Item</th><th>Observação</th><th>Evidência</th><th>Risco</th><th>Prioridade</th></tr></thead>
      <tbody>
        ${rows(
          report.nonConformities,
          (item, index) => `<tr><td>${index + 1}</td><td>${display(item.item)}</td><td>${display(item.observation)}</td><td>${display(item.evidence)}</td><td>${display(item.risk)}</td><td>${display(item.priority)}</td></tr>`,
          "Não foram identificadas não conformidades nesta auditoria.",
          6
        )}
      </tbody>
    </table>

    <h2>4. Pontuação Final</h2>
    <div class="summary-grid">
      <div class="metric-card"><small>Total de perguntas respondidas</small><strong>${report.summary.totalItems}</strong></div>
      <div class="metric-card"><small>Total de conformidades</small><strong>${report.summary.conformingItems}</strong></div>
      <div class="metric-card"><small>Não conformidades</small><strong>${report.summary.nonConformingItems}</strong></div>
      <div class="metric-card"><small>Não se aplica</small><strong>${report.summary.notApplicableItems}</strong></div>
      <div class="metric-card"><small>Percentual de conformidade</small><strong>${report.summary.compliancePercentage}%</strong></div>
      <div class="metric-card"><small>Percentual de não conformidade</small><strong>${report.summary.nonCompliancePercentage}%</strong></div>
    </div>
    <div class="classification-box">
      <p><strong>Classificação:</strong> ${display(report.summary.result)}</p>
      <p>Faixas: 90% a 100% - Excelente conformidade; 75% a 89% - Boa conformidade; 60% a 74% - Conformidade parcial; abaixo de 60% - Não conformidade crítica.</p>
    </div>

    <h2>5. Conclusão</h2>
    <p>${display(report.summary.finalOpinion)}</p>

    <h2>6. Assinatura</h2>
    <div class="signature-grid">
      <div class="signature">
        <strong>Assinatura do Auditor</strong><br />
        Nome: ${display(report.auditor.name)}<br />
        Data: ${formatDate(report.generatedAt, false)}
      </div>
      <div class="signature">
        <strong>Responsável pelo Setor Auditado</strong><br />
        Nome: ${display(report.sectorResponsible)}<br />
        Data: ${formatDate(report.generatedAt, false)}
      </div>
    </div>

    <div class="page-footer">QualiSaúde Hospitalar - ${display(report.auditCode)} - 2026</div>
  </section>
</body>
</html>`;
}
