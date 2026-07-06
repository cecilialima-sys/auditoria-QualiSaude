import assert from "node:assert/strict";
import test from "node:test";
import { generateAuditInterventions } from "./auditInterventionRules";
import { renderAuditReportHtml } from "./auditReportTemplate";
import type { AuditReportDocument, AuditReportItemInput } from "./auditReportTypes";

function response(overrides: Partial<AuditReportItemInput> = {}): AuditReportItemInput {
  return {
    questionId: "question-1",
    item: "Mantém os registros assistenciais completos e atualizados.",
    status: "Não conforme",
    observation: "Registro incompleto no prontuário.",
    risk: "Moderado",
    ...overrides
  };
}

function reportDocument(responses: AuditReportItemInput[]): AuditReportDocument {
  const interventions = generateAuditInterventions({
    status: "finalizada",
    sector: "Internação",
    category: "Assistência hospitalar",
    responses
  });
  const nonConformities = responses
    .filter((item) => item.status === "Não conforme")
    .map((item) => ({ ...item, priority: "Média", gravity: "Moderada" }));

  return {
    id: "report-1",
    auditCode: "AUD-TESTE",
    checklistId: "checklist-1",
    institution: "Hospital de teste",
    sector: "Internação",
    auditType: "Auditoria interna",
    auditDate: "2026-06-24T10:00:00.000Z",
    finalizedAt: "2026-06-24T11:00:00.000Z",
    generatedAt: "2026-06-24T11:00:00.000Z",
    method: "Checklist",
    auditor: {
      id: "auditor-1",
      name: "Auditor de teste",
      email: "auditor@example.com",
      role: "AUDITOR"
    },
    items: responses,
    nonConformities,
    summary: {
      totalItems: responses.length,
      applicableItems: responses.length,
      conformingItems: responses.filter((item) => item.status === "Conforme").length,
      nonConformingItems: nonConformities.length,
      notApplicableItems: 0,
      compliancePercentage: nonConformities.length ? 0 : 100,
      nonCompliancePercentage: nonConformities.length ? 100 : 0,
      result: nonConformities.length ? "Não conformidade crítica" : "Excelente conformidade",
      finalOpinion: "Parecer de teste."
    },
    findings: "Achados de teste.",
    recommendations: [],
    actionPlan: [],
    interventions,
    objective: "Objetivo de teste."
  };
}

test("gera uma intervenção vinculada a cada item não conforme", () => {
  const interventions = generateAuditInterventions({
    status: "finalizada",
    sector: "Internação",
    category: "Assistência hospitalar",
    responses: [response()]
  });

  assert.equal(interventions.length, 1);
  assert.equal(interventions[0].sourceQuestionId, "question-1");
  assert.equal(interventions[0].sourceItem, "Mantém os registros assistenciais completos e atualizados.");
  assert.equal(interventions[0].failureType, "documentação");
  assert.equal(interventions[0].severity, "Moderada");
  assert.match(interventions[0].recommendedEvidence, /Registro corrigido/);
});

test("não gera intervenções quando a auditoria não possui não conformidades", () => {
  const interventions = generateAuditInterventions({
    status: "finalizada",
    sector: "Radioterapia",
    responses: [response({ status: "Conforme", observation: undefined })]
  });

  assert.deepEqual(interventions, []);
});

test("prioriza ação imediata e análise de causa raiz para não conformidade crítica recorrente", () => {
  const interventions = generateAuditInterventions({
    status: "finalizada",
    sector: "Centro cirúrgico",
    responses: [
      response({
        item: "Cumpre o protocolo de cirurgia segura.",
        observation: "Descumprimento recorrente do protocolo.",
        risk: "Crítico"
      })
    ],
    previousOccurrencesByQuestionId: new Map([["question-1", 2]])
  });

  assert.equal(interventions.length, 1);
  assert.equal(interventions[0].severity, "Crítica");
  assert.equal(interventions[0].recurrent, true);
  assert.equal(interventions[0].recurrenceCount, 3);
  assert.equal(interventions[0].suggestedDeadline, "Imediato (até 24 horas)");
  assert.match(interventions[0].suggestedIntervention, /ação corretiva imediata/i);
  assert.match(interventions[0].suggestedIntervention, /análise de causa raiz/i);
});

test("não gera intervenções antes da finalização da auditoria", () => {
  const interventions = generateAuditInterventions({
    status: "em_andamento",
    sector: "Internação",
    responses: [response()]
  });

  assert.deepEqual(interventions, []);
});

test("renderiza a seção de intervenções somente quando há não conformidade", () => {
  const html = renderAuditReportHtml(reportDocument([response()]));

  assert.match(html, /Intervenções sugeridas para as não conformidades/);
  assert.match(html, /não substituem a análise/);
  assert.match(html, /Registro incompleto no prontuário/);
});

test("sem não conformidades, omite a seção e exibe a mensagem definida", () => {
  const html = renderAuditReportHtml(
    reportDocument([response({ status: "Conforme", observation: undefined })])
  );

  assert.doesNotMatch(html, /<h2>Intervenções sugeridas para as não conformidades<\/h2>/);
  assert.match(html, /Nenhuma intervenção necessária, pois não foram identificadas não conformidades\./);
  assert.match(html, /Não foram identificadas não conformidades nesta auditoria\./);
});
