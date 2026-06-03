import type { auditStatuses } from "@/lib/constants/audit-data";

export type AuditStatus = (typeof auditStatuses)[number];

export type ResponseScore = {
  status: AuditStatus;
};

export function calculateCompliance(responses: ResponseScore[]) {
  const applicable = responses.filter((response) => response.status !== "Não se aplica");

  if (!applicable.length) {
    return { percentage: 0, applicable: 0, classification: "Sem dados" };
  }

  const score = applicable.reduce((total, response) => {
    if (response.status === "Conforme") return total + 1;
    return total;
  }, 0);

  const percentage = Math.round((score / applicable.length) * 100);

  return {
    percentage,
    applicable: applicable.length,
    classification: classifyCompliance(percentage)
  };
}

export function classifyCompliance(percentage: number) {
  if (percentage >= 90) return "Excelente";
  if (percentage >= 75) return "Satisfatório";
  if (percentage >= 60) return "Atenção";
  return "Crítico";
}

export function intelligentConclusion(classification: string) {
  const conclusions: Record<string, string> = {
    Excelente:
      "O setor apresenta elevado grau de conformidade com os critérios avaliados, demonstrando aderência satisfatória aos protocolos institucionais e boas práticas assistenciais.",
    Satisfatório:
      "O setor apresenta desempenho adequado, embora existam pontos específicos que necessitam de acompanhamento e melhoria.",
    Atenção:
      "Foram identificadas fragilidades relevantes que demandam planejamento de ações corretivas e monitoramento sistemático.",
    Crítico:
      "O setor apresenta percentual de conformidade abaixo do esperado, exigindo intervenção prioritária, plano de ação imediato e reavaliação em curto prazo."
  };

  return conclusions[classification] ?? "Preencha os itens aplicáveis para gerar uma conclusão automática.";
}

export function countByStatus(responses: ResponseScore[]) {
  return responses.reduce<Record<string, number>>((acc, response) => {
    acc[response.status] = (acc[response.status] ?? 0) + 1;
    return acc;
  }, {});
}
