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
  const partiallyConformingItems = items.filter((item) => item.status === "Parcialmente conforme").length;
  const nonConformingItems = items.filter((item) => item.status === "Não conforme").length;
  const notApplicableItems = items.filter((item) => item.status === "Não se aplica").length;
  const applicableItems = items.length - notApplicableItems;
  const compliancePercentage = applicableItems
    ? Math.round(((conformingItems + partiallyConformingItems * 0.5) / applicableItems) * 100)
    : 0;

  const base = {
    totalItems: items.length,
    applicableItems,
    conformingItems,
    partiallyConformingItems,
    nonConformingItems,
    notApplicableItems,
    compliancePercentage
  };

  if (compliancePercentage >= 90) {
    return {
      ...base,
      result: "Excelente conformidade",
      finalOpinion:
        "A auditoria realizada no setor apresentou excelente conformidade geral. Recomenda-se manter o monitoramento periódico, preservar as evidências de boas práticas e tratar eventuais oportunidades pontuais de melhoria."
    };
  }

  if (compliancePercentage >= 75) {
    return {
      ...base,
      result: "Boa conformidade",
      finalOpinion:
        "A auditoria realizada no setor apresentou boa conformidade geral, porém foram identificados pontos que necessitam de adequação. Recomenda-se que a gestão responsável implemente as ações corretivas descritas neste relatório e realize nova avaliação em prazo oportuno."
    };
  }

  if (compliancePercentage >= 60) {
    return {
      ...base,
      result: "Conformidade parcial",
      finalOpinion:
        "A auditoria evidenciou conformidade parcial dos processos avaliados. Recomenda-se priorizar a regularização dos itens parcialmente conformes e não conformes, com acompanhamento da liderança do setor e reavaliação programada."
    };
  }

  return {
    ...base,
    result: "Não conformidade crítica",
    finalOpinion:
      "A auditoria identificou não conformidade crítica nos critérios avaliados. Recomenda-se intervenção imediata, plano de ação corretivo formal, definição de responsáveis e nova auditoria em curto prazo."
  };
}

function buildFindings(items: AuditReportItemInput[], summary: AuditReportSummary) {
  const positives = items.filter((item) => item.status === "Conforme").slice(0, 3).map((item) => item.item);
  const gaps = items
    .filter((item) => item.status === "Não conforme" || item.status === "Parcialmente conforme")
    .slice(0, 4)
    .map((item) => item.item);

  if (!gaps.length) {
    return `Durante a auditoria, os critérios avaliados apresentaram conformidade de ${summary.compliancePercentage}%, sem registro de não conformidades ou conformidades parciais nos itens aplicáveis.`;
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
  if (!Array.isArray(input.responses) || !input.responses.length) {
    return "Não foi possível gerar o relatório porque não existem respostas salvas para esta auditoria.";
  }
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

    const html = renderAuditReportHtml(document);
    const pdf = await this.renderPdf(document);
    if (!pdf.length) {
      throw new Error("Não foi possível gerar o relatório porque o PDF retornou vazio.");
    }
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
      pdf,
      document,
      html
    );

    return { report: stored, document, pdf };
  }

  private async renderPdf(report: AuditReportDocument) {
    try {
      return await this.renderPdfWithBrowser(report);
    } catch (error) {
      console.error(
        "[audit-report] Falha ao gerar PDF com Chromium. Usando fallback sem navegador.",
        error instanceof Error ? error.message : error
      );
      return this.renderFallbackPdf(report);
    }
  }

  private async renderPdfWithBrowser(report: AuditReportDocument) {
    const browser = await puppeteer.launch({
      headless: true,
      pipe: true,
      timeout: Number(process.env.PUPPETEER_LAUNCH_TIMEOUT_MS || 60000),
      protocolTimeout: Number(process.env.PUPPETEER_PROTOCOL_TIMEOUT_MS || 60000),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote"
      ]
    });

    try {
      const page = await browser.newPage();
      await page.setContent(renderAuditReportHtml(report), { waitUntil: "load", timeout: 30000 });
      await page.emulateMediaType("print");
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

  private renderFallbackPdf(report: AuditReportDocument) {
    const lines = this.buildFallbackLines(report);
    return buildTextPdf(lines);
  }

  private buildFallbackLines(report: AuditReportDocument) {
    const lines: string[] = [
      "RELATORIO DE AUDITORIA HOSPITALAR",
      report.institution,
      `Codigo: ${report.auditCode}`,
      `Setor auditado: ${report.sector}`,
      `Tipo de auditoria: ${report.auditType}`,
      `Data da auditoria: ${formatFallbackDate(report.auditDate)}`,
      `Finalizacao: ${formatFallbackDate(report.finalizedAt)}`,
      `Auditor responsavel: ${report.auditor.name}`,
      "",
      "1. OBJETIVO",
      report.objective,
      "",
      "2. RESUMO QUANTITATIVO",
      `Total avaliado: ${report.summary.totalItems}`,
      `Itens aplicaveis: ${report.summary.applicableItems}`,
      `Conformes: ${report.summary.conformingItems}`,
      `Parcialmente conformes: ${report.summary.partiallyConformingItems}`,
      `Nao conformes: ${report.summary.nonConformingItems}`,
      `Nao se aplica: ${report.summary.notApplicableItems}`,
      `Percentual de conformidade: ${report.summary.compliancePercentage}%`,
      `Resultado: ${report.summary.result}`,
      "",
      "3. ACHADOS DA AUDITORIA",
      report.findings,
      "",
      "4. CRITERIOS AVALIADOS"
    ];

    report.items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.item}`);
      lines.push(`Status: ${item.status}${item.risk ? ` | Risco: ${item.risk}` : ""}`);
      if (item.observation) lines.push(`Observacao: ${item.observation}`);
      if (item.evidence) lines.push(`Evidencia: ${item.evidence}`);
      lines.push("");
    });

    lines.push("5. NAO CONFORMIDADES ENCONTRADAS");
    if (!report.nonConformities.length) {
      lines.push("Nao foram registradas nao conformidades.");
    } else {
      report.nonConformities.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.item}`);
        lines.push(`Risco: ${item.risk || "-"} | Gravidade: ${item.gravity} | Prioridade: ${item.priority}`);
        if (item.observation) lines.push(`Observacao: ${item.observation}`);
        lines.push("");
      });
    }

    lines.push("", "6. RECOMENDACOES AUTOMATICAS");
    if (!report.recommendations.length) {
      lines.push("Sem recomendacoes automaticas; nao foram encontradas nao conformidades.");
    } else {
      report.recommendations.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.problem}`);
        lines.push(item.recommendation);
        lines.push(`Responsavel: ${item.suggestedResponsible} | Prazo: ${item.suggestedDeadline}`);
        lines.push(`Indicador: ${item.indicator}`, "");
      });
    }

    lines.push(
      "",
      "7. PLANO DE ACAO AUTOMATICO",
      ...(
        report.actionPlan.length
          ? report.actionPlan.flatMap((item, index) => [
              `${index + 1}. ${item.sourceItem}`,
              `Acao: ${item.recommendation}`,
              `Responsavel: ${item.suggestedResponsible} | Prazo: ${item.suggestedDeadline}`,
              `Indicador: ${item.indicator}`,
              ""
            ])
          : ["Sem plano de acao automatico para este relatorio."]
      ),
      "",
      "8. PARECER FINAL",
      `Resultado da auditoria: ${report.summary.result}. ${report.summary.finalOpinion}`,
      "",
      "9. ASSINATURA DO AUDITOR",
      "________________________________________",
      report.auditor.name,
      report.auditor.position ?? report.auditor.role,
      `Data do relatorio: ${formatFallbackDate(report.generatedAt)}`,
      "",
      "________________________________________",
      "Responsavel pelo Setor Auditado"
    );

    return lines;
  }
}

function formatFallbackDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function normalizePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapPdfText(text: string, maxLength = 92) {
  const normalized = normalizePdfText(text);
  if (!normalized) return [""];
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if (!current) {
      current = word;
      return;
    }
    if (`${current} ${word}`.length <= maxLength) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function escapePdfLiteral(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildTextPdf(sourceLines: string[]) {
  const pageHeight = 842;
  const pageWidth = 595;
  const marginLeft = 46;
  const top = 800;
  const lineHeight = 15;
  const maxLinesPerPage = 48;
  const wrappedLines = sourceLines.flatMap((line) => wrapPdfText(line));
  const pages: string[][] = [];

  for (let index = 0; index < wrappedLines.length; index += maxLinesPerPage) {
    pages.push(wrappedLines.slice(index, index + maxLinesPerPage));
  }

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push(`2 0 obj << /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >> endobj`);

  pages.forEach((lines, pageIndex) => {
    const pageObject = 3 + pageIndex * 2;
    const contentObject = pageObject + 1;
    const content = [
      "BT",
      "/F1 10 Tf",
      `${marginLeft} ${top} Td`,
      ...lines.flatMap((line, lineIndex) => [
        lineIndex === 0 ? "" : `0 -${lineHeight} Td`,
        `(${escapePdfLiteral(line)}) Tj`
      ]).filter(Boolean),
      "ET"
    ].join("\n");

    objects.push(`${pageObject} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObject} 0 R >> endobj`);
    objects.push(`${contentObject} 0 obj << /Length ${Buffer.byteLength(content, "latin1")} >> stream\n${content}\nendstream endobj`);
  });

  objects.push(`${3 + pages.length * 2} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${object}\n`;
  });

  const xrefOffset = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body, "latin1");
}
