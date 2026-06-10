import type { AccessUser } from "@/backend/infrastructure/auth/accessStore";

export type AuditReportStatus = "Conforme" | "Não conforme" | "Não se aplica";

export type AuditReportInput = {
  checklistId: string;
  institution?: string;
  sector: string;
  auditType: string;
  auditDate: string;
  sectorResponsible?: string;
  unit?: string;
  method?: string;
  signed: boolean;
  responses: AuditReportItemInput[];
};

export type AuditReportItemInput = {
  questionId: string;
  item: string;
  criterion?: string;
  status: AuditReportStatus;
  observation?: string;
  evidence?: string;
  risk?: string;
};

export type AuditReportSummary = {
  totalItems: number;
  applicableItems: number;
  conformingItems: number;
  nonConformingItems: number;
  notApplicableItems: number;
  compliancePercentage: number;
  result: "Excelente conformidade" | "Boa conformidade" | "Conformidade parcial" | "Não conformidade crítica";
  finalOpinion: string;
};

export type AuditRecommendation = {
  problem: string;
  recommendation: string;
  suggestedResponsible: string;
  suggestedDeadline: string;
  indicator: string;
};

export type AuditActionPlan = AuditRecommendation & {
  sourceItem: string;
  risk: string;
  priority: string;
};

export type AuditReportDocument = {
  id: string;
  auditCode: string;
  checklistId: string;
  institution: string;
  sector: string;
  auditType: string;
  auditDate: string;
  finalizedAt: string;
  generatedAt: string;
  sectorResponsible?: string;
  unit?: string;
  method: string;
  auditor: {
    id: string;
    name: string;
    email: string;
    role: string;
    position?: string;
    coren?: string;
  };
  items: AuditReportItemInput[];
  nonConformities: Array<AuditReportItemInput & { priority: string; gravity: string }>;
  summary: AuditReportSummary;
  findings: string;
  recommendations: AuditRecommendation[];
  actionPlan: AuditActionPlan[];
  objective: string;
};

export type StoredAuditReport = {
  id: string;
  auditCode: string;
  checklistId: string;
  sector: string;
  auditType: string;
  auditorId: string;
  auditorName: string;
  compliancePercentage: number;
  result: string;
  generatedAt: string;
  filePath: string;
  documentPath?: string;
  htmlPath?: string;
  hash: string;
  version: number;
};

export type GenerateAuditReportResult = {
  report: StoredAuditReport;
  document: AuditReportDocument;
  pdf: Buffer;
};

export function auditorFromUser(user: AccessUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    position: user.role === "ADMIN" ? "Administrador do sistema" : user.role,
    coren: undefined
  };
}
