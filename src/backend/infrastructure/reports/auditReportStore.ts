import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import type { AuditReportDocument, StoredAuditReport } from "@/backend/application/reports/auditReportTypes";
import { getPrismaClient } from "@/backend/infrastructure/database/prismaClient";

const globalState = globalThis as typeof globalThis & {
  qualisaudeAuditReports?: StoredAuditReport[];
  qualisaudeAuditReportsStoreMtimeMs?: number;
  qualisaudeAuditReportsPrismaUnavailable?: boolean;
};

const dataDir = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(process.cwd(), "data");
const storePath = process.env.AUDIT_REPORT_STORE_PATH
  ? resolve(process.env.AUDIT_REPORT_STORE_PATH)
  : join(dataDir, "audit-report-store.json");
const reportsDir = process.env.REPORTS_DIR ? resolve(process.env.REPORTS_DIR) : join(dataDir, "reports");

async function withPrisma<T>(operation: (prisma: ReturnType<typeof getPrismaClient>) => Promise<T>) {
  if (globalState.qualisaudeAuditReportsPrismaUnavailable) return null;
  try {
    return await operation(getPrismaClient());
  } catch (error) {
    globalState.qualisaudeAuditReportsPrismaUnavailable = true;
    console.warn("[audit-report-store] Prisma indisponível. Usando store local.", error instanceof Error ? error.message : error);
    return null;
  }
}

function readPersistedReports() {
  if (!existsSync(storePath)) return [];
  try {
    globalState.qualisaudeAuditReportsStoreMtimeMs = statSync(storePath).mtimeMs;
    return JSON.parse(readFileSync(storePath, "utf8")) as StoredAuditReport[];
  } catch {
    return [];
  }
}

function saveReportMetadata() {
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(storePath, JSON.stringify(globalState.qualisaudeAuditReports ?? [], null, 2));
  globalState.qualisaudeAuditReportsStoreMtimeMs = statSync(storePath).mtimeMs;
}

function dbReportToStored(row: any): StoredAuditReport {
  const generatedAt = row.generatedAt instanceof Date ? row.generatedAt.toISOString() : new Date(row.generatedAt).toISOString();
  const localFilePath = join(reportsDir, `${row.id}.pdf`);
  const localDocumentPath = join(reportsDir, `${row.id}.json`);
  const localHtmlPath = join(reportsDir, `${row.id}.html`);

  return {
    id: row.id,
    auditCode: row.auditCode,
    checklistId: row.checklistId,
    sector: row.sector,
    auditType: row.auditType,
    auditorId: row.auditorId,
    auditorName: row.auditorName,
    compliancePercentage: row.compliancePercentage,
    result: row.result,
    generatedAt,
    filePath: localFilePath,
    documentPath: localDocumentPath,
    htmlPath: localHtmlPath,
    hash: row.fileHash,
    version: row.version
  };
}

function mergeReports(primary: StoredAuditReport[], fallback: StoredAuditReport[]) {
  const seen = new Set(primary.map((report) => report.id));
  return [
    ...primary,
    ...fallback.filter((report) => !seen.has(report.id))
  ].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
}

async function readDbReports() {
  return withPrisma(async (prisma) => {
    const rows = await (prisma as any).auditStoredReport.findMany({
      orderBy: { generatedAt: "desc" }
    });
    return rows.map(dbReportToStored) as StoredAuditReport[];
  });
}

async function findDbReport(id: string) {
  return withPrisma(async (prisma) => {
    const row = await (prisma as any).auditStoredReport.findUnique({ where: { id } });
    return row ?? null;
  });
}

async function persistDbReport(stored: StoredAuditReport, pdf: Buffer, document: AuditReportDocument, html: string) {
  await withPrisma(async (prisma) => {
    await (prisma as any).auditStoredReport.upsert({
      where: { id: stored.id },
      update: {
        auditCode: stored.auditCode,
        checklistId: stored.checklistId,
        sector: stored.sector,
        auditType: stored.auditType,
        auditorId: stored.auditorId,
        auditorName: stored.auditorName,
        compliancePercentage: stored.compliancePercentage,
        result: stored.result,
        generatedAt: new Date(stored.generatedAt),
        fileHash: stored.hash,
        version: stored.version,
        documentJson: document as any,
        htmlContent: html,
        pdfContent: pdf
      },
      create: {
        id: stored.id,
        auditCode: stored.auditCode,
        checklistId: stored.checklistId,
        sector: stored.sector,
        auditType: stored.auditType,
        auditorId: stored.auditorId,
        auditorName: stored.auditorName,
        compliancePercentage: stored.compliancePercentage,
        result: stored.result,
        generatedAt: new Date(stored.generatedAt),
        fileHash: stored.hash,
        version: stored.version,
        documentJson: document as any,
        htmlContent: html,
        pdfContent: pdf
      }
    });
  });
}

export async function getStoredAuditReports() {
  const currentMtime = existsSync(storePath) ? statSync(storePath).mtimeMs : undefined;
  if (
    !globalState.qualisaudeAuditReports ||
    currentMtime !== globalState.qualisaudeAuditReportsStoreMtimeMs
  ) {
    globalState.qualisaudeAuditReports = readPersistedReports();
    globalState.qualisaudeAuditReportsStoreMtimeMs = currentMtime;
  }

  const dbReports = await readDbReports();
  if (!dbReports) return globalState.qualisaudeAuditReports;
  return mergeReports(dbReports, globalState.qualisaudeAuditReports);
}

export async function findStoredAuditReport(id: string) {
  return (await getStoredAuditReports()).find((report) => report.id === id);
}

export async function readStoredAuditReportPdf(id: string) {
  const dbReport = await findDbReport(id);
  if (dbReport) {
    return { report: dbReportToStored(dbReport), pdf: Buffer.from(dbReport.pdfContent) };
  }

  const report = await findStoredAuditReport(id);
  if (!report || !existsSync(report.filePath)) return null;
  return { report, pdf: readFileSync(report.filePath) };
}

export async function readStoredAuditReportHtml(id: string) {
  const dbReport = await findDbReport(id);
  if (dbReport) {
    return { report: dbReportToStored(dbReport), html: dbReport.htmlContent as string };
  }

  const report = await findStoredAuditReport(id);
  if (!report?.htmlPath || !existsSync(report.htmlPath)) return null;
  return { report, html: readFileSync(report.htmlPath, "utf8") };
}

export async function readStoredAuditReportDocument(id: string) {
  const dbReport = await findDbReport(id);
  if (dbReport) {
    return {
      report: dbReportToStored(dbReport),
      document: dbReport.documentJson as AuditReportDocument
    };
  }

  const report = await findStoredAuditReport(id);
  if (!report?.documentPath || !existsSync(report.documentPath)) return null;
  try {
    return {
      report,
      document: JSON.parse(readFileSync(report.documentPath, "utf8")) as AuditReportDocument
    };
  } catch {
    return null;
  }
}

export async function persistAuditReport(
  record: Omit<StoredAuditReport, "filePath" | "documentPath" | "htmlPath" | "hash" | "version">,
  pdf: Buffer,
  document: AuditReportDocument,
  html: string
) {
  mkdirSync(reportsDir, { recursive: true });
  const filePath = join(reportsDir, `${record.id}.pdf`);
  const documentPath = join(reportsDir, `${record.id}.json`);
  const htmlPath = join(reportsDir, `${record.id}.html`);
  writeFileSync(filePath, pdf);
  writeFileSync(documentPath, JSON.stringify(document, null, 2));
  writeFileSync(htmlPath, html);

  const stored: StoredAuditReport = {
    ...record,
    filePath,
    documentPath,
    htmlPath,
    hash: createHash("sha256").update(pdf).digest("hex"),
    version: 2
  };

  globalState.qualisaudeAuditReports = [
    stored,
    ...(globalState.qualisaudeAuditReports ?? readPersistedReports()).filter((report) => report.id !== stored.id)
  ];
  saveReportMetadata();
  await persistDbReport(stored, pdf, document, html);
  return stored;
}
