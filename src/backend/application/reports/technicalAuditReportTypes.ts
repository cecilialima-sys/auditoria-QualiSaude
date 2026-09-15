export type TechnicalReportStatus = "pending" | "processing" | "ready";

export type NormativeReference = {
  label: string;
  sourceUrl?: string;
  validatedAt?: string;
};

export type TechnicalReportItem = {
  questionId: string;
  number: string;
  requirement: string;
  classification: "Conforme" | "Não conforme" | "Não se aplica";
  evidenceOriginal: string;
  observation: string;
  analysisAi: string;
  analysisFinal: string;
  normativeReferences: NormativeReference[];
  generatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
};

export type TechnicalReportSummary = {
  total: number;
  conforming: number;
  nonConforming: number;
  notApplicable: number;
  conformityPercentage: number;
  nonConformityPercentage: number;
  generalOpinion: string;
  positivePoints: string[];
  criticalPoints: string[];
  improvementPoints: string[];
};

export type TechnicalAuditReportDocument = {
  id: string;
  auditId: string;
  auditCode: string;
  status: TechnicalReportStatus;
  institution: string;
  objective: string;
  scope: string;
  location: string;
  planNumber: string;
  auditType: string;
  normativeReference: string;
  auditTeam: string;
  auditDate: string;
  closingDate?: string;
  sectorResponsible: string;
  items: TechnicalReportItem[];
  summary: TechnicalReportSummary;
  createdAt: string;
  updatedAt: string;
};

export type StoredTechnicalAuditReport = {
  id: string;
  auditId: string;
  auditCode: string;
  status: TechnicalReportStatus;
  generatedAt: string;
};
