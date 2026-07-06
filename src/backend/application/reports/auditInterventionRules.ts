import type { AuditReportItemInput } from "@/backend/application/reports/auditReportTypes";

export type AuditInterventionSeverity = "Leve" | "Moderada" | "Grave" | "Crítica";

export type AuditIntervention = {
  sourceQuestionId: string;
  sourceItem: string;
  category: string;
  nonConformity: string;
  severity: AuditInterventionSeverity;
  failureType: "documentação" | "processo" | "treinamento" | "sistema" | "geral";
  recurrent: boolean;
  recurrenceCount: number;
  suggestedIntervention: string;
  suggestedResponsible: string;
  suggestedDeadline: string;
  recommendedEvidence: string;
  effectivenessVerification: string;
};

export type AuditInterventionGenerationInput = {
  status: string;
  sector: string;
  category?: string;
  responses: AuditReportItemInput[];
  previousOccurrencesByQuestionId?: ReadonlyMap<string, number>;
};

type InterventionRule = {
  type: AuditIntervention["failureType"];
  keywords: string[];
  intervention: string;
  evidence: string;
  verification: string;
  responsible: string;
  deadline: string;
};

// As regras ficam declaradas em dados para permitir ajustes futuros sem alterar
// o fluxo de geração do relatório ou espalhar condicionais pela aplicação.
const INTERVENTION_RULES: InterventionRule[] = [
  {
    type: "sistema",
    keywords: [
      "sisapec",
      "sistema",
      "integracao",
      "tecnologia",
      "software",
      "indisponibilidade",
      "erro de tela",
      "falha sistemica",
      "inconsistencia"
    ],
    intervention:
      "Registrar a ocorrência para análise técnica, verificar inconsistências no sistema e acompanhar a correção junto à equipe responsável pela integração.",
    evidence: "Chamado técnico, print da inconsistência ou registro da correção.",
    verification: "Testar novamente a funcionalidade após a correção.",
    responsible: "Tecnologia da Informação / equipe responsável pelo SisAPEC",
    deadline: "15 dias"
  },
  {
    type: "treinamento",
    keywords: [
      "treinamento",
      "capacitacao",
      "competencia",
      "desconhecimento",
      "orientacao",
      "equipe nao conhece",
      "erro recorrente",
      "educacao permanente"
    ],
    intervention:
      "Realizar capacitação direcionada com a equipe envolvida, abordando o item não conforme e os critérios esperados.",
    evidence: "Lista de presença, material de treinamento ou certificado de capacitação.",
    verification: "Aplicar nova auditoria ou reavaliação após o treinamento.",
    responsible: "Educação permanente e liderança do setor",
    deadline: "30 dias"
  },
  {
    type: "documentação",
    keywords: [
      "registro",
      "documento",
      "documentacao",
      "prontuario",
      "preenchimento",
      "informacao ausente",
      "incompleto",
      "nao registrado",
      "sem registro",
      "evidencia",
      "assinatura"
    ],
    intervention:
      "Orientar a equipe quanto ao preenchimento correto dos registros, revisar o fluxo de documentação e realizar nova verificação em auditoria posterior.",
    evidence: "Registro corrigido, documento atualizado ou print do sistema.",
    verification: "Reavaliar o mesmo item na próxima auditoria.",
    responsible: "Liderança do setor e equipe responsável pelo registro",
    deadline: "30 dias"
  },
  {
    type: "processo",
    keywords: [
      "processo",
      "protocolo",
      "procedimento",
      "fluxo",
      "descumprimento",
      "nao cumpre",
      "nao aplica",
      "padronizacao",
      "rotina",
      "diretriz"
    ],
    intervention:
      "Revisar o protocolo institucional relacionado, reforçar o fluxo com a equipe responsável e acompanhar a execução do processo.",
    evidence: "Protocolo revisado, ata de reunião ou registro de orientação da equipe.",
    verification: "Comparar a ocorrência da mesma não conformidade em auditorias futuras.",
    responsible: "Gestão da qualidade e liderança do setor",
    deadline: "30 dias"
  }
];

const DEFAULT_RULE: InterventionRule = {
  type: "geral",
  keywords: [],
  intervention:
    "Analisar a causa da não conformidade, definir ação corretiva proporcional ao risco, orientar os envolvidos e acompanhar a regularização do item.",
  evidence: "Plano de ação, registro da correção, checklist ou outro comprovante aplicável.",
  verification: "Reavaliar o item e confirmar a manutenção da conformidade em auditoria posterior.",
  responsible: "Gestão do setor",
  deadline: "30 dias"
};

function normalize(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isFinalized(status: string) {
  const normalized = normalize(status);
  return normalized === "finalizada" || normalized === "finalizado" || normalized === "completed";
}

function isNonConforming(status: string) {
  return normalize(status) === "nao conforme";
}

function severityForItem(item: AuditReportItemInput, content: string): AuditInterventionSeverity {
  const risk = normalize(item.risk);
  if (risk === "critico" || risk === "critica") return "Crítica";
  if (risk === "alto" || risk === "alta" || risk === "grave") return "Grave";
  if (risk === "moderado" || risk === "moderada") return "Moderada";
  if (risk === "baixo" || risk === "baixa" || risk === "leve") return "Leve";

  // Classificação automática simples quando o sistema não recebeu um risco.
  if (["risco iminente", "obito", "dano grave", "evento sentinela"].some((term) => content.includes(term))) {
    return "Crítica";
  }
  if (["seguranca do paciente", "evento adverso", "infeccao", "medicamento de alto risco"].some((term) => content.includes(term))) {
    return "Grave";
  }
  if (["ausencia", "descumprimento", "nao possui", "nao realiza"].some((term) => content.includes(term))) {
    return "Moderada";
  }
  return "Leve";
}

function ruleForContent(content: string) {
  return (
    INTERVENTION_RULES.find((rule) => rule.keywords.some((keyword) => content.includes(normalize(keyword)))) ??
    DEFAULT_RULE
  );
}

function deadlineFor(severity: AuditInterventionSeverity, recurrent: boolean, fallback: string) {
  if (severity === "Crítica") return "Imediato (até 24 horas)";
  if (severity === "Grave") return "Curto prazo (até 7 dias)";
  if (recurrent) return "Curto prazo (até 15 dias)";
  if (severity === "Moderada") return "Médio prazo (até 30 dias)";
  return fallback === "30 dias" ? "Longo prazo (até 60 dias)" : fallback;
}

function buildInterventionText(
  base: string,
  severity: AuditInterventionSeverity,
  recurrent: boolean
) {
  const additions: string[] = [];

  // Gravidade crítica/grave prevalece sobre a regra temática.
  if (severity === "Crítica" || severity === "Grave") {
    additions.push(
      "Realizar ação corretiva imediata, comunicar a gestão responsável, definir responsável pelo plano de ação e acompanhar a resolução em prazo reduzido."
    );
  } else if (severity === "Leve" && !recurrent) {
    additions.push("Realizar orientação pontual à equipe e manter acompanhamento do item em auditorias futuras.");
  }

  // Reincidência acrescenta análise de causa raiz sem apagar a orientação específica.
  if (recurrent) {
    additions.push(
      "Realizar análise de causa raiz, revisar o processo relacionado e implementar plano de ação corretivo com acompanhamento pela gestão."
    );
  }

  return [base, ...additions].join(" ");
}

export function generateAuditInterventions(
  auditResult: AuditInterventionGenerationInput
): AuditIntervention[] {
  // A função se recusa a gerar conteúdo antes da finalização, reforçando que
  // intervenções pertencem exclusivamente ao relatório final.
  if (!isFinalized(auditResult.status)) return [];

  return auditResult.responses
    .filter((item) => isNonConforming(item.status))
    .map((item) => {
      const content = normalize(
        `${item.item} ${item.criterion ?? ""} ${item.observation ?? ""} ${item.evidence ?? ""}`
      );
      const rule = ruleForContent(content);
      const previousOccurrences = auditResult.previousOccurrencesByQuestionId?.get(item.questionId) ?? 0;
      const recurrent = previousOccurrences > 0;
      const severity = severityForItem(item, content);

      return {
        sourceQuestionId: item.questionId,
        sourceItem: item.item,
        category: auditResult.category?.trim() || auditResult.sector,
        nonConformity:
          item.observation?.trim() ||
          `O item foi marcado como não conforme na auditoria, sem descrição adicional registrada pelo auditor.`,
        severity,
        failureType: rule.type,
        recurrent,
        recurrenceCount: previousOccurrences + 1,
        suggestedIntervention: buildInterventionText(rule.intervention, severity, recurrent),
        suggestedResponsible:
          severity === "Crítica" || severity === "Grave"
            ? `Gestão responsável e ${rule.responsible}`
            : rule.responsible,
        suggestedDeadline: deadlineFor(severity, recurrent, rule.deadline),
        recommendedEvidence:
          severity === "Crítica" || severity === "Grave"
            ? `${rule.evidence} Plano de ação, registro de comunicação à gestão e comprovação da correção.`
            : recurrent
              ? `${rule.evidence} Análise de causa raiz, plano de ação e registros de acompanhamento.`
              : rule.evidence,
        effectivenessVerification:
          severity === "Crítica" || severity === "Grave"
            ? "Realizar auditoria de acompanhamento em curto prazo e confirmar a eliminação ou redução do risco."
            : recurrent
              ? "Comparar indicadores antes e depois da intervenção e verificar a não reincidência em auditoria posterior."
              : rule.verification
      };
    });
}
