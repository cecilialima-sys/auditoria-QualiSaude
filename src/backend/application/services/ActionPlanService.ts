import { ActionPlan } from "@/backend/domain/entities/entities";
import { ActionPlanStatus } from "@/backend/domain/enums/audit.enums";

export class ActionPlanService {
  markOverdue(plan: ActionPlan, now = new Date()) {
    if (plan.status === ActionPlanStatus.COMPLETED || plan.status === ActionPlanStatus.CANCELED) return plan;
    return plan.deadline < now ? { ...plan, status: ActionPlanStatus.OVERDUE } : plan;
  }

  validateByAuditor(plan: ActionPlan, auditorName: string) {
    return {
      ...plan,
      status: ActionPlanStatus.COMPLETED,
      validationByAuditor: auditorName
    };
  }
}
