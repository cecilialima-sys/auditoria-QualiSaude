import { ActionPlanStatus, ItemStatus, RiskLevel, RoleName } from "@/backend/domain/enums/audit.enums";

export type BaseEntity = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};

export type Role = BaseEntity & {
  name: RoleName;
  permissions: string[];
};

export type User = BaseEntity & {
  name: string;
  email: string;
  passwordHash: string;
  role: RoleName;
  sectorIds: string[];
};

export type Sector = BaseEntity & {
  name: string;
  description?: string;
  active: boolean;
};

export type ChecklistItem = BaseEntity & {
  category: string;
  item: string;
  criterion: string;
  sectorId?: string;
};

export type AuditResponse = BaseEntity & {
  checklistItemId: string;
  status: ItemStatus;
  evidenceObserved?: string;
  observation?: string;
  riskLevel?: RiskLevel;
};

export type Audit = BaseEntity & {
  sectorId: string;
  auditorId: string;
  sectorResponsible: string;
  auditType: string;
  category: string;
  finalStatus: "DRAFT" | "IN_PROGRESS" | "COMPLETED";
  responses: AuditResponse[];
};

export type NonConformity = BaseEntity & {
  auditId: string;
  description: string;
  sectorId: string;
  riskLevel: RiskLevel;
  resolvedAt?: Date;
};

export type ActionPlan = BaseEntity & {
  nonConformityId: string;
  correctiveAction: string;
  responsible: string;
  deadline: Date;
  status: ActionPlanStatus;
  validationByAuditor?: string;
};

export type Evidence = BaseEntity & {
  auditId?: string;
  actionPlanId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
};

export type Report = BaseEntity & {
  auditId: string;
  compliancePercentage: number;
  classification: string;
  automaticConclusion: string;
};
