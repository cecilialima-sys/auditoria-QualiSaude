import { z } from "zod";

export const auditResponseSchema = z.object({
  checklistItemId: z.string().min(1),
  status: z.enum(["COMPLIANT", "NON_COMPLIANT", "PARTIALLY_COMPLIANT", "NOT_APPLICABLE", "NOT_OBSERVED"]),
  evidenceObserved: z.string().max(1000).optional(),
  observation: z.string().max(2000).optional(),
  riskLevel: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).optional()
});

export const createAuditSchema = z.object({
  sectorId: z.string().min(1),
  auditorId: z.string().min(1),
  sectorResponsible: z.string().min(2),
  auditType: z.string().min(2),
  category: z.string().min(2),
  responses: z.array(auditResponseSchema).default([])
});
