import { renderAuditHtmlToPdf } from "@/backend/application/reports/AuditReportPdfService";
import { renderTechnicalAuditReportHtml } from "@/backend/application/reports/technicalAuditReportTemplate";
import { TechnicalAuditAiService } from "@/backend/application/services/TechnicalAuditAiService";
import { saveTechnicalAuditReport } from "@/backend/infrastructure/reports/technicalAuditReportStore";
import type { AuditWorkflowResponseRecord } from "@/backend/infrastructure/audits/auditWorkflowStore";
import type { ChecklistGroup } from "@/lib/checklists/checklist-template";
import type { TechnicalAuditReportDocument, TechnicalReportItem } from "@/backend/application/reports/technicalAuditReportTypes";

function calculate(items: TechnicalReportItem[]) {
  const conforming = items.filter((item) => item.classification === "Conforme").length;
  const nonConforming = items.filter((item) => item.classification === "Não conforme").length;
  const notApplicable = items.filter((item) => item.classification === "Não se aplica").length;
  const applicable = items.length - notApplicable;
  return { total: items.length, conforming, nonConforming, notApplicable, conformityPercentage: applicable ? Math.round(conforming / applicable * 100) : 0, nonConformityPercentage: applicable ? Math.round(nonConforming / applicable * 100) : 0, generalOpinion: "Análises pendentes de geração e revisão pelo auditor.", positivePoints: [] as string[], criticalPoints: [] as string[], improvementPoints: [] as string[] };
}

export function createTechnicalReport(input: { auditId: string; checklist: ChecklistGroup; audit: { setor: string; responsavelSetor: string; auditorNome: string; tipoAuditoria?: string; observacoesIniciais?: string; dataInicio: string }; responses: AuditWorkflowResponseRecord[] }) {
  const byQuestion = new Map(input.responses.map((response) => [response.perguntaId, response]));
  const items = input.checklist.questions.map((question) => {
    const answer = byQuestion.get(question.id);
    return {
      questionId: question.id,
      number: question.itemNumber || String(question.ordem),
      requirement: question.text,
      classification: (answer?.resposta || "Não se aplica") as TechnicalReportItem["classification"],
      evidenceOriginal: answer?.evidenciaOriginal || answer?.evidencia || "",
      observation: answer?.observacao || "",
      auditGuidance: question.explanation || question.criterion || "",
      analysisAi: "",
      analysisFinal: "",
      normativeReferences: []
    };
  });
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), auditId: input.auditId, auditCode: `RLAUDIINT-${now.slice(0, 10).replaceAll("-", "")}-${input.auditId.slice(0, 6).toUpperCase()}`, status: "pending", institution: "QualiSaúde Hospitalar", objective: input.audit.observacoesIniciais?.trim() || "Avaliar a conformidade dos requisitos aplicáveis ao setor auditado.", scope: `Avaliação dos requisitos do checklist ${input.checklist.category}.`, location: input.audit.setor, planNumber: "Não informado", auditType: input.audit.tipoAuditoria || "Auditoria interna", normativeReference: input.checklist.category, auditTeam: input.audit.auditorNome, auditDate: input.audit.dataInicio, sectorResponsible: input.audit.responsavelSetor, items, summary: calculate(items), createdAt: now, updatedAt: now } satisfies TechnicalAuditReportDocument;
}

export async function persistTechnicalReport(document: TechnicalAuditReportDocument) {
  const html = renderTechnicalAuditReportHtml(document); const pdf = await renderAuditHtmlToPdf(html, document.auditCode);
  await saveTechnicalAuditReport(document, html, pdf); return document;
}

export async function generateTechnicalReportBatch(document: TechnicalAuditReportDocument, maximum = 2) {
  // Proteção adicional para documentos legados. A rota normaliza esses registros
  // antes de chegar aqui; esta guarda evita que uma chamada futura os quebre.
  const documentItems = Array.isArray(document.items) ? document.items : [];
  const ai = new TechnicalAuditAiService(); const pending = documentItems.filter((item) => !item.analysisAi).slice(0, Math.max(1, Math.min(maximum, 3)));
  const next: TechnicalAuditReportDocument = { ...document, status: "processing", items: documentItems.map((item) => ({ ...item })) };
  for (const item of pending) {
    const target = next.items.find((candidate) => candidate.questionId === item.questionId)!;
    const result = await ai.analyzeItem({ sector: next.location, auditType: next.auditType, normativeReference: next.normativeReference, item: target });
    target.analysisAi = result.analysis; target.analysisFinal = result.analysis; target.normativeReferences = result.references; target.generatedAt = new Date().toISOString();
  }
  if (!next.items.some((item) => !item.analysisAi)) { next.summary = await ai.synthesize(calculate(next.items), next.items); next.status = "ready"; next.closingDate = new Date().toISOString(); }
  next.updatedAt = new Date().toISOString(); return persistTechnicalReport(next);
}
