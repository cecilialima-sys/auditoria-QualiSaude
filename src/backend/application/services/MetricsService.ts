import { Audit, NonConformity } from "@/backend/domain/entities/entities";
import { RiskLevel } from "@/backend/domain/enums/audit.enums";

export class MetricsService {
  summarize(audits: Audit[], nonConformities: NonConformity[]) {
    return {
      totalAudits: audits.length,
      completedAudits: audits.filter((audit) => audit.finalStatus === "COMPLETED").length,
      openNonConformities: nonConformities.filter((item) => !item.resolvedAt).length,
      criticalRisk: nonConformities.filter((item) => item.riskLevel === RiskLevel.CRITICAL && !item.resolvedAt).length
    };
  }
}
