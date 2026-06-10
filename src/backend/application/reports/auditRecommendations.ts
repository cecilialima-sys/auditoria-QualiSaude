import type { AuditActionPlan, AuditRecommendation, AuditReportItemInput } from "@/backend/application/reports/auditReportTypes";

const recommendationRules: Array<{
  keywords: string[];
  recommendation: AuditRecommendation;
}> = [
  {
    keywords: ["identificação", "identificacao", "identificador", "pulseira"],
    recommendation: {
      problem: "Falha ou fragilidade na identificação do paciente",
      recommendation:
        "Recomenda-se reforçar a conferência dos dois identificadores do paciente antes de procedimentos, administração de medicamentos, coleta de exames e transferências internas.",
      suggestedResponsible: "Coordenação de enfermagem",
      suggestedDeadline: "Imediato",
      indicator: "Percentual de pacientes corretamente identificados"
    }
  },
  {
    keywords: ["medicamento", "medicação", "checagem", "prescrição"],
    recommendation: {
      problem: "Checagem incompleta ou fragilidade no processo de medicamentos",
      recommendation:
        "Recomenda-se reforçar o protocolo de administração segura de medicamentos, incluindo checagem correta, horário, assinatura e justificativa em caso de não administração.",
      suggestedResponsible: "Enfermeiro líder",
      suggestedDeadline: "7 dias",
      indicator: "Percentual de prescrições corretamente checadas"
    }
  },
  {
    keywords: ["queda"],
    recommendation: {
      problem: "Ausência ou fragilidade na avaliação de risco de queda",
      recommendation:
        "Recomenda-se tornar obrigatória a avaliação de risco de queda na admissão e durante a permanência do paciente, conforme protocolo institucional.",
      suggestedResponsible: "Enfermeiro assistencial",
      suggestedDeadline: "Imediato",
      indicator: "Percentual de pacientes com escala de risco de queda preenchida"
    }
  },
  {
    keywords: ["lesão por pressão", "lesao por pressao", "pele", "integridade"],
    recommendation: {
      problem: "Ausência ou fragilidade na avaliação de risco para lesão por pressão",
      recommendation:
        "Recomenda-se reforçar a aplicação da escala de risco para lesão por pressão, registrar a integridade da pele e implementar medidas preventivas conforme o risco identificado.",
      suggestedResponsible: "Enfermeiro assistencial",
      suggestedDeadline: "Imediato",
      indicator: "Percentual de pacientes com avaliação de pele registrada"
    }
  },
  {
    keywords: ["higienização das mãos", "higienizacao das maos", "mãos", "maos", "preparação alcoólica"],
    recommendation: {
      problem: "Fragilidade na higienização das mãos",
      recommendation:
        "Recomenda-se intensificar ações educativas sobre higienização das mãos e monitorar a adesão aos momentos recomendados para prevenção de infecções relacionadas à assistência.",
      suggestedResponsible: "CCIH / Educação permanente",
      suggestedDeadline: "30 dias",
      indicator: "Taxa de adesão à higienização das mãos"
    }
  },
  {
    keywords: ["evolução", "evolucao", "registro", "prontuário", "prontuario", "sae"],
    recommendation: {
      problem: "Registros assistenciais incompletos ou inconsistentes",
      recommendation:
        "Recomenda-se capacitar a equipe quanto aos registros assistenciais claros, completos, cronológicos e juridicamente adequados, incluindo evolução de enfermagem e registros no prontuário.",
      suggestedResponsible: "Coordenação de enfermagem",
      suggestedDeadline: "15 dias",
      indicator: "Percentual de prontuários com registros completos"
    }
  },
  {
    keywords: ["equipamento", "manutenção", "manutencao", "infraestrutura", "estrutura"],
    recommendation: {
      problem: "Fragilidade estrutural, operacional ou de equipamentos",
      recommendation:
        "Recomenda-se revisar o plano de manutenção preventiva, disponibilidade de equipamentos e condições estruturais necessárias para execução segura dos processos assistenciais.",
      suggestedResponsible: "Gestão do setor / Manutenção",
      suggestedDeadline: "30 dias",
      indicator: "Percentual de pendências estruturais resolvidas no prazo"
    }
  }
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function recommendationForItem(item: AuditReportItemInput): AuditRecommendation {
  const content = normalize(`${item.item} ${item.criterion ?? ""} ${item.observation ?? ""}`);
  const matched = recommendationRules.find((rule) => rule.keywords.some((keyword) => content.includes(normalize(keyword))));

  if (matched) {
    return matched.recommendation;
  }

  return {
    problem: `Não conformidade relacionada a: ${item.item}`,
    recommendation: "Recomenda-se analisar a causa da não conformidade, padronizar o processo, orientar a equipe envolvida e monitorar a efetividade da ação corretiva.",
    suggestedResponsible: "Gestão do setor",
    suggestedDeadline: item.risk === "Crítico" ? "Imediato" : "30 dias",
    indicator: "Percentual de itens regularizados na reavaliação"
  };
}

export function buildRecommendations(items: AuditReportItemInput[]) {
  const findings = items.filter((item) => item.status === "Não conforme");
  const unique = new Map<string, AuditRecommendation>();

  findings.forEach((item) => {
    const recommendation = recommendationForItem(item);
    unique.set(`${recommendation.problem}-${recommendation.recommendation}`, recommendation);
  });

  return [...unique.values()];
}

export function buildActionPlan(items: AuditReportItemInput[]): AuditActionPlan[] {
  return items
    .filter((item) => item.status === "Não conforme")
    .map((item) => {
      const recommendation = recommendationForItem(item);
      return {
        ...recommendation,
        sourceItem: item.item,
        risk: item.risk || "Moderado",
        priority: item.risk === "Crítico"
            ? "Imediata"
            : item.risk === "Alto"
              ? "Alta"
              : "Programada"
      };
    });
}
