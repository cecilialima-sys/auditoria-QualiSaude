import { Audit, AuditResponse } from "@/backend/domain/entities/entities";
import { ItemStatus } from "@/backend/domain/enums/audit.enums";

export class AuditService {
  calculateCompliance(responses: Pick<AuditResponse, "status">[]) {
    const applicable = responses.filter(
      (response) => response.status !== ItemStatus.NOT_APPLICABLE && response.status !== ItemStatus.NOT_OBSERVED
    );

    if (!applicable.length) return { percentage: 0, classification: "Sem dados" };

    const score = applicable.reduce((total, response) => {
      if (response.status === ItemStatus.COMPLIANT) return total + 1;
      if (response.status === ItemStatus.PARTIALLY_COMPLIANT) return total + 0.5;
      return total;
    }, 0);

    const percentage = Math.round((score / applicable.length) * 100);
    return { percentage, classification: this.classify(percentage) };
  }

  classify(percentage: number) {
    if (percentage >= 90) return "Excelente";
    if (percentage >= 75) return "Satisfatório";
    if (percentage >= 60) return "Atenção";
    return "Crítico";
  }

  finalizeAudit(audit: Audit) {
    const result = this.calculateCompliance(audit.responses);
    return {
      ...audit,
      finalStatus: "COMPLETED" as const,
      result
    };
  }
}
