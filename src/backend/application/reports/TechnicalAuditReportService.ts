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
  // O fluxo de auditoria expõe a versão em português (`perguntas`), enquanto
  // alguns modelos internos usam `questions`. Aceitar ambos evita que um
  // relatório técnico novo quebre ao tentar chamar `.map` em uma coleção ausente.
  const checklist = input.checklist as ChecklistGroup & { perguntas?: Array<Record<string, unknown>>; titulo?: string };
  const questions = Array.isArray(checklist.questions)
    ? checklist.questions
    : Array.isArray(checklist.perguntas)
      ? checklist.perguntas
      : [];
  const responses = Array.isArray(input.responses) ? input.responses : [];
  const byQuestion = new Map(responses.map((response) => [response.perguntaId, response]));
  const items = questions.map((question, index) => {
    const source = question as Record<string, unknown>;
    const questionId = typeof source.id === "string" ? source.id : `question-${index + 1}`;
    const number = typeof source.itemNumber === "string"
      ? source.itemNumber
      : typeof source.ordem === "number" || typeof source.ordem === "string"
        ? String(source.ordem)
        : String(index + 1);
    const requirement = typeof source.text === "string"
      ? source.text
      : typeof source.pergunta === "string"
        ? source.pergunta
        : "Requisito não informado";
    const guidance = typeof source.explanation === "string"
      ? source.explanation
      : typeof source.explicacao === "string"
        ? source.explicacao
        : typeof source.criterion === "string"
          ? source.criterion
          : "";
    const answer = byQuestion.get(questionId);
    return {
      questionId,
      number,
      requirement,
      classification: (answer?.resposta || "Não se aplica") as TechnicalReportItem["classification"],
      evidenceOriginal: answer?.evidenciaOriginal || answer?.evidencia || "",
      observation: answer?.observacao || "",
      auditGuidance: guidance,
      analysisAi: "",
      analysisFinal: "",
      normativeReferences: []
    };
  });
  const now = new Date().toISOString();
  const checklistTitle = typeof checklist.category === "string" ? checklist.category : checklist.titulo || "selecionado";
  return { id: crypto.randomUUID(), auditId: input.auditId, auditCode: `RLAUDIINT-${now.slice(0, 10).replaceAll("-", "")}-${input.auditId.slice(0, 6).toUpperCase()}`, status: "pending", institution: "QualiSaúde Hospitalar", objective: input.audit.observacoesIniciais?.trim() || "Avaliar a conformidade dos requisitos aplicáveis ao setor auditado.", scope: `Avaliação dos requisitos do checklist ${checklistTitle}.`, location: input.audit.setor, planNumber: "Não informado", auditType: input.audit.tipoAuditoria || "Auditoria interna", normativeReference: checklistTitle, auditTeam: input.audit.auditorNome, auditDate: input.audit.dataInicio, sectorResponsible: input.audit.responsavelSetor, items, summary: calculate(items), createdAt: now, updatedAt: now } satisfies TechnicalAuditReportDocument;
}

export async function persistTechnicalReport(document: TechnicalAuditReportDocument) {
  const html = renderTechnicalAuditReportHtml(document); const pdf = await renderAuditHtmlToPdf(html, document.auditCode);
  await saveTechnicalAuditReport(document, html, pdf); return document;
}

export async function generateTechnicalReportBatch(document: TechnicalAuditReportDocument, maximum = 2, retryUnavailable = false) {
  // Proteção adicional para documentos legados. A rota normaliza esses registros
  // antes de chegar aqui; esta guarda evita que uma chamada futura os quebre.
  const documentItems = Array.isArray(document.items) ? document.items : [];
  const ai = new TechnicalAuditAiService(); const pending = documentItems.filter((item) => !item.analysisAi && (retryUnavailable || !item.aiUnavailable)).slice(0, Math.max(1, Math.min(maximum, 3)));
  const next: TechnicalAuditReportDocument = { ...document, status: "processing", items: documentItems.map((item) => ({ ...item })) };
  for (const item of pending) {
    const target = next.items.find((candidate) => candidate.questionId === item.questionId)!;
    try {
      target.aiUnavailable = false;
      target.aiError = undefined;
      const result = await ai.analyzeItem({ sector: next.location, auditType: next.auditType, normativeReference: next.normativeReference, item: target });
      target.analysisAi = result.analysis; target.analysisFinal = result.analysis; target.normativeReferences = result.references; target.generatedAt = new Date().toISOString();
    } catch (error) {
      // A IA é um apoio. Sua indisponibilidade não pode impedir a emissão do
      // relatório nem ocultar a evidência registrada pelo auditor.
      target.aiUnavailable = true;
      target.aiError = error instanceof Error ? error.message : "A análise por IA não pôde ser concluída.";
      target.analysisFinal = target.analysisFinal || target.evidenceOriginal || target.observation || "Não foi registrada evidência ou observação complementar para este requisito.";
    }
  }
  if (!next.items.some((item) => !item.analysisAi && !item.aiUnavailable)) { next.summary = await ai.synthesize(calculate(next.items), next.items); next.status = "ready"; next.closingDate = new Date().toISOString(); }
  next.updatedAt = new Date().toISOString(); return persistTechnicalReport(next);
}
