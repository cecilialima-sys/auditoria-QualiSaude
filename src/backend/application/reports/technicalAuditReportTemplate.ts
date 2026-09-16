import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { TechnicalAuditReportDocument, TechnicalReportItem } from "@/backend/application/reports/technicalAuditReportTypes";

function esc(value: unknown) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function text(value: unknown) { const result = String(value ?? "").trim(); return result ? esc(result).replaceAll("\n", "<br />") : "—"; }
function date(value?: string) { if (!value) return "—"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? esc(value) : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(parsed); }

function publicAssetDataUri(fileName: string, mimeType: string, label: string) {
  const filePath = join(process.cwd(), "public", fileName);
  if (existsSync(filePath)) return `data:${mimeType};base64,${readFileSync(filePath).toString("base64")}`;
  return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="100"><rect width="100%" height="100%" fill="white"/><text x="110" y="54" text-anchor="middle" font-family="Arial" font-size="16">${esc(label)}</text></svg>`).toString("base64")}`;
}

function evidence(item: TechnicalReportItem) {
  return item.analysisFinal || item.analysisAi || item.evidenceOriginal || "Não foi registrada evidência ou observação complementar para este requisito.";
}

function row(item: TechnicalReportItem) {
  const references = Array.isArray(item.normativeReferences) && item.normativeReferences.length
    ? `<div class="references"><strong>Referências validadas:</strong> ${item.normativeReferences.map((reference) => text(reference.label)).join("; ")}</div>`
    : "";
  return `<tr><td class="number">${text(item.number)}</td><td class="requirement">${text(item.requirement)}</td><td class="mark">${item.classification === "Conforme" ? "X" : ""}</td><td class="mark">${item.classification === "Não conforme" ? "X" : ""}</td><td class="mark">${item.classification === "Não se aplica" ? "X" : ""}</td><td class="finding">${text(evidence(item))}${references}</td></tr>`;
}

function list(items: string[]) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  return safeItems.length ? `<ul>${safeItems.map((item) => `<li>${text(item)}</li>`).join("")}</ul>` : "<p>—</p>";
}

/** Modelo tabular compatível com os relatórios de auditoria interna da instituição. */
export function renderTechnicalAuditReportHtml(report: TechnicalAuditReportDocument) {
  const qualiLogo = publicAssetDataUri("qualisaude-logo-white-bg.png", "image/png", "QualiSaúde");
  const unifalLogo = publicAssetDataUri("template-unifal-logo.jpg", "image/jpeg", "UNIFAL-MG");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Relatório de Auditoria Interna - ${text(report.auditCode)}</title><style>
    @page { size: A4; margin: 10mm 10mm 15mm; }
    * { box-sizing:border-box; } body { color:#000; font-family:Arial,Helvetica,sans-serif; font-size:9.8px; line-height:1.2; margin:0; } table { border-collapse:collapse; width:100%; } .header, .metadata, .items, .summary, .improvements { margin-bottom:6mm; } .header td, .metadata td, .items th, .items td, .summary > div, .improvements { border:1px solid #111; } .header td { height:20mm; padding:2px 4px; vertical-align:middle; } .header .brand { width:14%; text-align:center; } .header .brand img { display:block; margin:auto; max-height:16mm; max-width:30mm; object-fit:contain; } .header .title { width:67%; font-size:14px; font-weight:700; text-align:center; } .header .code { width:13%; font-size:9px; vertical-align:top; } .header .code strong { font-size:10px; } .metadata td { padding:3px 4px; vertical-align:top; } .metadata .label { font-weight:700; white-space:nowrap; } .metadata .split-label { font-weight:700; width:18%; white-space:nowrap; } .items { table-layout:fixed; margin-top:6mm; } .items col.number-column { width:4%; } .items col.requirement-column { width:35%; } .items col.mark-column { width:4%; } .items col.finding-column { width:49%; } .items thead { display:table-header-group; } .items th { background:#d1d1d1; font-size:9.6px; font-weight:700; padding:3px; text-align:center; vertical-align:middle; } .items th.group { background:#fff; font-size:10px; } .items td { padding:4px; vertical-align:top; page-break-inside:avoid; overflow-wrap:anywhere; } .items .number { text-align:center; vertical-align:middle; } .items .requirement { vertical-align:middle; } .items .mark { font-weight:700; text-align:center; vertical-align:middle; } .items .finding { text-align:justify; } .references { border-top:1px solid #888; font-size:8px; margin-top:3px; padding-top:3px; text-align:left; } h2 { font-size:10.5px; margin:5mm 0 2mm; } .conclusion { border:1px solid #111; min-height:18mm; padding:4px; text-align:justify; } .summary { display:grid; grid-template-columns:1fr 1fr; margin-bottom:0; } .summary > div { min-height:35mm; padding:4px; } .summary > div + div { border-left:0; } .improvements { border-top:0; min-height:30mm; padding:4px; } ul { list-style-type:square; margin:2px 0 0 14px; padding:0; } li { margin:0 0 2px; text-align:justify; } .closing { font-size:10px; font-weight:700; margin:5mm 0 18mm 1mm; } .signatures { display:grid; grid-template-columns:1fr 1fr; column-gap:26mm; text-align:center; } .signature { border-top:1px solid #111; padding-top:2px; min-height:12mm; } .signature strong { display:block; font-size:10px; }
  </style></head><body>
  <table class="header"><tbody><tr><td class="brand"><img src="${qualiLogo}" alt="QualiSaúde"/></td><td class="title">RELATÓRIO DE AUDITORIA INTERNA</td><td class="code"><strong>Código:</strong><br/>${text(report.auditCode)}<hr/><strong>Páginas:</strong></td><td class="brand"><img src="${unifalLogo}" alt="UNIFAL-MG"/></td></tr></tbody></table>
  <table class="metadata"><tbody><tr><td colspan="4"><span class="label">Objetivo:</span> ${text(report.objective)}</td></tr><tr><td colspan="4"><span class="label">Escopo:</span> ${text(report.scope)}</td></tr><tr><td colspan="2"><span class="split-label">Local:</span> ${text(report.location)}</td><td colspan="2"><span class="split-label">Nº do Plano:</span> ${text(report.planNumber)}</td></tr><tr><td colspan="2"><span class="split-label">Tipo de Auditoria:</span> ${text(report.auditType)}</td><td colspan="2"><span class="split-label">Norma de Referência:</span> ${text(report.normativeReference)}</td></tr><tr><td colspan="2"><span class="split-label">Equipe Auditora:</span> ${text(report.auditTeam)}</td><td colspan="2"><span class="split-label">Data de Realização:</span> ${date(report.auditDate)}</td></tr></tbody></table>
  <table class="items"><colgroup><col class="number-column"/><col class="requirement-column"/><col class="mark-column"/><col class="mark-column"/><col class="mark-column"/><col class="finding-column"/></colgroup><thead><tr><th class="group" colspan="2">REQUISITOS NORMATIVOS: ${text(report.normativeReference)}</th><th class="group">C</th><th class="group">NC</th><th class="group">NA</th><th class="group">Constatações / Evidências</th></tr><tr><th>Nº</th><th>REQUISITO</th><th></th><th></th><th></th><th></th></tr></thead><tbody>${(Array.isArray(report.items) ? report.items : []).map(row).join("")}</tbody></table>
  <h2>Conclusão</h2><section class="conclusion"><strong>Parecer Geral:</strong> ${text(report.summary?.generalOpinion)}</section>
  <section class="summary"><div><strong>Pontos Positivos:</strong>${list(report.summary?.positivePoints ?? [])}</div><div><strong>Pontos críticos:</strong>${list(report.summary?.criticalPoints ?? [])}</div></section>
  <section class="improvements"><strong>Pontos de Melhoria:</strong>${list(report.summary?.improvementPoints ?? [])}</section>
  <p class="closing">Data de Fechamento do Relatório de Auditoria: ${date(report.closingDate)}</p>
  <section class="signatures"><div class="signature">${text(report.sectorResponsible)}<strong>Gestão de Qualidade:</strong></div><div class="signature">${text(report.auditTeam)}<strong>UNIFAL:</strong></div></section>
  </body></html>`;
}
