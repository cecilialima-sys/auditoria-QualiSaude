import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { getPrismaClient } from "@/backend/infrastructure/database/prismaClient";
import type { StoredTechnicalAuditReport, TechnicalAuditReportDocument, TechnicalReportStatus } from "@/backend/application/reports/technicalAuditReportTypes";

const dataDir = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(process.cwd(), "data");
const storePath = join(dataDir, "technical-audit-report-store.json");

type LocalRow = { report: StoredTechnicalAuditReport; document: TechnicalAuditReportDocument; html: string; pdf: string };
const globalState = globalThis as typeof globalThis & { technicalAuditReports?: LocalRow[] };

function localRows(): LocalRow[] {
  if (globalState.technicalAuditReports) return globalState.technicalAuditReports;
  try { globalState.technicalAuditReports = JSON.parse(readFileSync(storePath, "utf8")); } catch { globalState.technicalAuditReports = []; }
  return globalState.technicalAuditReports ?? [];
}
function saveLocal() { mkdirSync(dirname(storePath), { recursive: true }); writeFileSync(storePath, JSON.stringify(localRows(), null, 2)); }
function statusFromDb(status: string): TechnicalReportStatus { return status === "READY" ? "ready" : status === "IN_PROGRESS" ? "processing" : "pending"; }
function statusToDb(status: TechnicalReportStatus) { return status === "ready" ? "READY" : status === "processing" ? "IN_PROGRESS" : "PENDING"; }
function dbRow(row: any): StoredTechnicalAuditReport { return { id: row.id, auditId: row.auditId, auditCode: row.auditCode, status: statusFromDb(row.status), generatedAt: new Date(row.updatedAt).toISOString() }; }

async function withPrisma<T>(operation: (prisma: ReturnType<typeof getPrismaClient>) => Promise<T>) {
  if (!process.env.DATABASE_URL?.trim()) return null;
  return operation(getPrismaClient());
}

export async function findTechnicalAuditReportByAudit(auditId: string) {
  const row = await withPrisma(async (prisma) => (prisma as any).auditTechnicalReport.findUnique({ where: { auditId } }));
  if (row) return { report: dbRow(row), document: row.documentJson as TechnicalAuditReportDocument, html: row.htmlContent as string, pdf: Buffer.from(row.pdfContent) };
  const local = localRows().find((item) => item.report.auditId === auditId);
  return local ? { report: local.report, document: local.document, html: local.html, pdf: Buffer.from(local.pdf, "base64") } : null;
}

export async function findTechnicalAuditReport(id: string) {
  const row = await withPrisma(async (prisma) => (prisma as any).auditTechnicalReport.findUnique({ where: { id } }));
  if (row) return { report: dbRow(row), document: row.documentJson as TechnicalAuditReportDocument, html: row.htmlContent as string, pdf: Buffer.from(row.pdfContent) };
  const local = localRows().find((item) => item.report.id === id);
  return local ? { report: local.report, document: local.document, html: local.html, pdf: Buffer.from(local.pdf, "base64") } : null;
}

export async function saveTechnicalAuditReport(document: TechnicalAuditReportDocument, html: string, pdf: Buffer) {
  const report: StoredTechnicalAuditReport = { id: document.id, auditId: document.auditId, auditCode: document.auditCode, status: document.status, generatedAt: document.updatedAt };
  const persisted = await withPrisma(async (prisma) => (prisma as any).auditTechnicalReport.upsert({
    where: { auditId: document.auditId },
    update: { auditCode: document.auditCode, status: statusToDb(document.status), documentJson: document as any, htmlContent: html, pdfContent: pdf },
    create: { id: document.id, auditId: document.auditId, auditCode: document.auditCode, status: statusToDb(document.status), documentJson: document as any, htmlContent: html, pdfContent: pdf }
  }));
  if (persisted) return report;
  const rows = localRows(); const index = rows.findIndex((item) => item.report.auditId === document.auditId);
  const local: LocalRow = { report, document, html, pdf: pdf.toString("base64") };
  if (index >= 0) rows[index] = local; else rows.unshift(local);
  saveLocal();
  return report;
}

export function technicalReportHash(pdf: Buffer) { return createHash("sha256").update(pdf).digest("hex"); }
