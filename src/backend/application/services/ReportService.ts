import { Audit } from "@/backend/domain/entities/entities";
import { AuditService } from "@/backend/application/services/AuditService";

export class ReportService {
  constructor(private readonly auditService = new AuditService()) {}

  generate(audit: Audit) {
    const result = this.auditService.calculateCompliance(audit.responses);
    return {
      auditId: audit.id,
      sectorId: audit.sectorId,
      auditorId: audit.auditorId,
      totalItems: audit.responses.length,
      compliancePercentage: result.percentage,
      classification: result.classification,
      conclusion: this.conclusion(result.classification)
    };
  }

  conclusion(classification: string) {
    const map: Record<string, string> = {
      Excelente: "O setor apresenta elevado grau de conformidade com os critérios avaliados.",
      Satisfatório: "O setor apresenta desempenho adequado, com pontos específicos de melhoria.",
      Atenção: "Foram identificadas fragilidades relevantes que demandam ações corretivas.",
      Crítico: "O setor exige intervenção prioritária, plano de ação imediato e reavaliação."
    };
    return map[classification] ?? "Relatório pendente de dados suficientes.";
  }
}
