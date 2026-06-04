import puppeteer from "puppeteer";
import type { AccessUser } from "@/backend/infrastructure/auth/accessStore";
import { checklistTemplateGroups } from "@/lib/checklists/checklist-template";
import { buildActionPlan, buildRecommendations } from "@/backend/application/reports/auditRecommendations";
import { renderAuditReportHtml } from "@/backend/application/reports/auditReportTemplate";
import {
  auditorFromUser,
  type AuditReportDocument,
  type AuditReportInput,
  type AuditReportItemInput,
  type AuditReportSummary,
  type GenerateAuditReportResult
} from "@/backend/application/reports/auditReportTypes";
import { persistAuditReport } from "@/backend/infrastructure/reports/auditReportStore";

function priorityFromRisk(risk?: string) {
  if (risk === "Crítico") return "Imediata";
  if (risk === "Alto") return "Alta";
  if (risk === "Moderado") return "Média";
  return "Programada";
}

function gravityFromRisk(risk?: string) {
  if (risk === "Crítico" || risk === "Alto") return risk;
  if (risk === "Moderado") return "Moderada";
  return "Baixa";
}

function calculateSummary(items: AuditReportItemInput[]): AuditReportSummary {
  const conformingItems = items.filter((item) => item.status === "Conforme").length;
  const nonConformingItems = items.filter((item) => item.status === "Não conforme").length;
  const notApplicableItems = items.filter((item) => item.status === "Não se aplica").length;
  const applicableItems = items.length - notApplicableItems;
  const compliancePercentage = applicableItems ? Math.round((conformingItems / applicableItems) * 100) : 0;

  if (compliancePercentage >= 90) {
    return {
      totalItems: items.length,
      applicableItems,
      conformingItems,
      nonConformingItems,
      notApplicableItems,
      compliancePercentage,
      result: "Conforme",
      finalOpinion: "O setor auditado apresenta boa adesão aos critérios avaliados, com pequenas oportunidades de melhoria."
    };
  }

  if (compliancePercentage >= 70) {
    return {
      totalItems: items.length,
      applicableItems,
      conformingItems,
      nonConformingItems,
      notApplicableItems,
      compliancePercentage,
      result: "Em atenção",
      finalOpinion:
        "O setor auditado apresenta funcionamento adequado, porém foram identificadas não conformidades que exigem plano de ação e acompanhamento."
    };
  }

  return {
    totalItems: items.length,
    applicableItems,
    conformingItems,
    nonConformingItems,
    notApplicableItems,
    compliancePercentage,
    result: "Não conforme",
    finalOpinion:
      "O setor auditado apresenta fragilidades relevantes nos critérios avaliados, sendo necessária intervenção imediata, plano de ação corretivo e nova auditoria em curto prazo."
  };
}

function buildFindings(items: AuditReportItemInput[], summary: AuditReportSummary) {
  const positives = items.filter((item) => item.status === "Conforme").slice(0, 3).map((item) => item.item);
  const gaps = items
    .filter((item) => item.status === "Não conforme")
    .slice(0, 4)
    .map((item) => item.item);

  if (!gaps.length) {
    return `Durante a auditoria, os critérios avaliados apresentaram conformidade de ${summary.compliancePercentage}%, sem registro de não conformidades nos itens aplicáveis.`;
  }

  const positiveText = positives.length
    ? `Foram identificados pontos positivos relacionados a ${positives.join("; ")}.`
    : "Foram avaliados os processos assistenciais e administrativos do setor.";

  return `${positiveText} Entretanto, foram observadas oportunidades de melhoria em ${gaps.join("; ")}, exigindo plano de ação e acompanhamento sistemático.`;
}

function validateInput(input: AuditReportInput) {
  if (!input.signed) return "A confirmação digital do auditor é obrigatória.";
  if (!input.checklistId) return "Checklist não informado.";
  if (!input.sector) return "Setor auditado é obrigatório.";
  if (!input.auditType) return "Tipo de auditoria é obrigatório.";
  if (!input.auditDate) return "Data da auditoria é obrigatória.";
  if (!Array.isArray(input.responses) || !input.responses.length) return "Respostas do checklist são obrigatórias.";
  if (input.responses.some((response) => !response.questionId || !response.item || !response.status)) {
    return "Todas as respostas devem possuir item, pergunta e status.";
  }
  return null;
}

export class AuditReportPdfService {
  async finalizeAndGenerate(input: AuditReportInput, user: AccessUser): Promise<GenerateAuditReportResult> {
    const validationError = validateInput(input);
    if (validationError) throw new Error(validationError);

    const checklist = checklistTemplateGroups.find((group) => group.id === input.checklistId);
    if (!checklist) throw new Error("Checklist não encontrado.");

    const allowedQuestionIds = new Set(checklist.questions.map((question) => question.id));
    const invalidQuestion = input.responses.find((response) => !allowedQuestionIds.has(response.questionId));
    if (invalidQuestion) throw new Error("O checklist contém pergunta inválida para o setor selecionado.");

    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();
    const auditCode = `AUD-${now.slice(0, 10).replaceAll("-", "")}-${reportId.slice(0, 8).toUpperCase()}`;
    const summary = calculateSummary(input.responses);
    const nonConformities = input.responses
      .filter((item) => item.status === "Não conforme")
      .map((item) => ({ ...item, gravity: gravityFromRisk(item.risk), priority: priorityFromRisk(item.risk) }));

    const document: AuditReportDocument = {
      id: reportId,
      auditCode,
      checklistId: input.checklistId,
      institution: input.institution?.trim() || "QualiSaúde Hospitalar",
      sector: input.sector,
      auditType: input.auditType,
      auditDate: input.auditDate,
      finalizedAt: now,
      generatedAt: now,
      sectorResponsible: input.sectorResponsible,
      unit: input.unit,
      method: input.method || "Checklist estruturado de auditoria hospitalar com análise de conformidade e plano de ação.",
      auditor: auditorFromUser(user),
      items: input.responses,
      nonConformities,
      summary,
      findings: buildFindings(input.responses, summary),
      recommendations: buildRecommendations(input.responses),
      actionPlan: buildActionPlan(input.responses),
      objective:
        "Este relatório tem como objetivo avaliar a conformidade dos processos assistenciais, registros, protocolos institucionais e práticas de segurança do paciente no setor auditado."
    };

    const pdf = await this.renderPdf(document);
    const stored = persistAuditReport(
      {
        id: reportId,
        auditCode,
        checklistId: input.checklistId,
        sector: input.sector,
        auditType: input.auditType,
        auditorId: user.id,
        auditorName: user.name,
        compliancePercentage: summary.compliancePercentage,
        result: summary.result,
        generatedAt: now
      },
      pdf
    );

    return { report: stored, document, pdf };
  }

  private async renderPdf(report: AuditReportDocument) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    try {
      const page = await browser.newPage();
      await page.setContent(renderAuditReportHtml(report), { waitUntil: "networkidle0" });
      return Buffer.from(
        await page.pdf({
          format: "A4",
          printBackground: true,
          displayHeaderFooter: true,
          footerTemplate:
            '<div style="width:100%;font-size:9px;color:#657789;text-align:center;padding:0 12mm;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
          headerTemplate: "<div></div>",
          margin: { top: "16mm", right: "12mm", bottom: "18mm", left: "12mm" }
        })
      );
    } finally {
      await browser.close();
    }
  }
}
