import type { auditStatuses } from "@/lib/constants/audit-data";

export type AuditStatus = (typeof auditStatuses)[number];

export type ResponseScore = {
  status: AuditStatus;
};

export function calculateCompliance(responses: ResponseScore[]) {
  const applicable = responses.filter((response) => response.status !== "Nao se aplica");

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
  if (percentage >= 75) return "Satisfatorio";
  if (percentage >= 60) return "Atencao";
  return "Critico";
}

export function intelligentConclusion(classification: string) {
  const conclusions: Record<string, string> = {
    Excelente:
      "O setor apresenta elevado grau de conformidade com os criterios avaliados, demonstrando aderencia satisfatoria aos protocolos institucionais e boas praticas assistenciais.",
    Satisfatorio:
      "O setor apresenta desempenho adequado, embora existam pontos especificos que necessitam de acompanhamento e melhoria.",
    Atencao:
      "Foram identificadas fragilidades relevantes que demandam planejamento de acoes corretivas e monitoramento sistematico.",
    Critico:
      "O setor apresenta percentual de conformidade abaixo do esperado, exigindo intervencao prioritaria, plano de acao imediato e reavaliacao em curto prazo."
  };

  return conclusions[classification] ?? "Preencha os itens aplicaveis para gerar uma conclusao automatica.";
}

export function countByStatus(responses: ResponseScore[]) {
  return responses.reduce<Record<string, number>>((acc, response) => {
    acc[response.status] = (acc[response.status] ?? 0) + 1;
    return acc;
  }, {});
}
